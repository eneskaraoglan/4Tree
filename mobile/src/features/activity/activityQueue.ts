import { ServiceError } from '@/services';
import type { ActivityService } from '@/services';

import type { KeyValueStorage } from './storage';

/** Depo anahtarı; çıkışta yerel veriyi temizleyen kod da bunu kullanır. */
export const ACTIVITY_QUEUE_KEY = '@4tree/activity-queue/v1';

/** Bu kadar gerçek başarısızlıktan sonra giriş "gönderilemedi" olur; kullanıcı yeniden dener ya da siler. */
export const MAX_SEND_ATTEMPTS = 5;

export type SaveActivityInput = Parameters<ActivityService['saveActivity']>[0];

/**
 * Gönderilmeyi bekleyen aktivite. `localId` yalnız cihazda kimliktir: aynı kayıt iki kez kuyruğa girmez.
 * `userId` kaydı yapan hesaptır; başka hesap açıksa gösterilmeden silinir.
 */
export type QueuedActivity = {
  localId: string;
  userId: string | null;
  input: SaveActivityInput;
  queuedAt: number;
  /** Ağ dışı gerçek başarısızlık sayısı (ağ yokken denemeler sayılmaz). */
  attempts: number;
};

export type FlushResult = { sent: number; remaining: number };

export const isFailed = (item: QueuedActivity): boolean => item.attempts >= MAX_SEND_ATTEMPTS;

/** Bağlantı/oturum kaynaklı geçici hata: tekrar denemek anlamlı, deneme sayısına yazılmaz. */
function isTransient(error: unknown): boolean {
  return error instanceof ServiceError && (error.code === 'network' || error.code === 'unauthenticated');
}

/**
 * Saf kuyruk mantığı: sırayla gönderir.
 * - "Gönderilemedi" durumundaki (>= MAX_SEND_ATTEMPTS) girişler otomatik gönderilmez; yerinde kalır.
 * - Geçici hata (ağ/oturum): durur (sıra bozulmasın), kalanlar yerinde kalır, deneme sayısı artmaz.
 * - `invalid`: giriş atlanır, deneme sayısı artar (veri silinmez), sonrakilere geçilir.
 * - Bilinmeyen hata: durur ve deneme sayısı artar.
 */
export async function flushItems(
  items: readonly QueuedActivity[],
  send: (input: SaveActivityInput) => Promise<unknown>,
  onSent?: (item: QueuedActivity) => Promise<void>,
): Promise<{ remaining: QueuedActivity[]; sent: number }> {
  const remaining: QueuedActivity[] = [];
  let sent = 0;
  let stopped = false;
  for (const item of items) {
    if (stopped || isFailed(item)) {
      remaining.push(item);
      continue;
    }
    try {
      await send(item.input);
      sent += 1;
      await onSent?.(item);
    } catch (error) {
      remaining.push(isTransient(error) ? item : { ...item, attempts: item.attempts + 1 });
      if (!(error instanceof ServiceError && error.code === 'invalid')) stopped = true;
    }
  }
  return { remaining, sent };
}

function isQueued(value: unknown): value is QueuedActivity {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const input = v.input as Record<string, unknown> | undefined;
  return (
    typeof v.localId === 'string' &&
    (v.userId === null || typeof v.userId === 'string') &&
    typeof v.queuedAt === 'number' &&
    typeof v.attempts === 'number' &&
    typeof input === 'object' &&
    input !== null &&
    (input.type === 'run' || input.type === 'walk') &&
    typeof input.durationSec === 'number' &&
    Array.isArray(input.route)
  );
}

export type ActivityQueue = {
  /**
   * Yalnız bu kullanıcının girişleri (başkalarının girişleri silinir). `userId` verilmezse süzme yapılmaz
   * (tüm girişler; yalnız temizlik/test için, ekranlar her zaman kimlik verir).
   */
  list(userId?: string | null): Promise<QueuedActivity[]>;
  /** Aynı localId varsa tekrar eklenmez. */
  enqueue(localId: string, input: SaveActivityInput, userId: string | null): Promise<void>;
  /**
   * Bu kullanıcının bekleyenlerini sırayla gönderir. Zaten sürüyorsa aynı işleme katılır (çift gönderim yok).
   * `userId` verilmezse tüm girişler işlenir.
   */
  flush(send: (input: SaveActivityInput) => Promise<unknown>, userId?: string | null): Promise<FlushResult>;
  /** "Gönderilemedi" girişlerinin deneme sayısını sıfırlar (kullanıcı "Yeniden dene" dedi). */
  retryFailed(userId: string | null): Promise<void>;
  /** "Gönderilemedi" girişlerini siler (kullanıcı "Sil" dedi). */
  removeFailed(userId: string | null): Promise<void>;
  /** Tüm kuyruğu siler (çıkışta). */
  clear(): Promise<void>;
  subscribe(listener: () => void): () => void;
};

export function createActivityQueue(storage: KeyValueStorage, now: () => number = Date.now): ActivityQueue {
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  let flushing: Promise<FlushResult> | null = null;
  // Okuma-değiştirme-yazma işlemleri sıraya girer; yarış durumu olmasın.
  let chain: Promise<unknown> = Promise.resolve();
  const exclusive = <T>(work: () => Promise<T>): Promise<T> => {
    const run = chain.then(work, work);
    chain = run.catch(() => undefined);
    return run;
  };

  async function read(): Promise<QueuedActivity[]> {
    const raw = await storage.getItem(ACTIVITY_QUEUE_KEY);
    if (raw === null) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isQueued) : [];
    } catch {
      return [];
    }
  }
  const write = (items: readonly QueuedActivity[]) =>
    items.length === 0
      ? storage.removeItem(ACTIVITY_QUEUE_KEY)
      : storage.setItem(ACTIVITY_QUEUE_KEY, JSON.stringify(items));

  /** Başka hesaba ait girişleri siler ve bu kullanıcınınkileri döner. */
  async function readOwned(userId: string | null | undefined): Promise<QueuedActivity[]> {
    const all = await read();
    if (userId === undefined) return all;
    const owned = all.filter((i) => i.userId === userId);
    if (owned.length !== all.length) await write(owned);
    return owned;
  }

  return {
    list: (userId) => exclusive(() => readOwned(userId)),
    enqueue: (localId, input, userId) =>
      exclusive(async () => {
        const items = await readOwned(userId);
        if (items.some((i) => i.localId === localId)) return;
        await write([...items, { localId, userId, input, queuedAt: now(), attempts: 0 }]);
        notify();
      }),
    flush(send, userId) {
      if (flushing) return flushing;
      flushing = (async (): Promise<FlushResult> => {
        try {
          const items = await exclusive(() => readOwned(userId));
          if (items.length === 0) return { sent: 0, remaining: 0 };
          // Her başarılı gönderim hemen diske işlenir: uygulama ortada kapansa gönderilen tekrar gönderilmez.
          const { remaining, sent } = await flushItems(items, send, (item) =>
            exclusive(async () => {
              await write((await read()).filter((i) => i.localId !== item.localId));
            }),
          );
          // Deneme sayılarını güncelle (gönderim sırasında eklenen yeni girişler korunur).
          const attempts = new Map(remaining.map((r) => [r.localId, r.attempts]));
          await exclusive(async () => {
            await write((await read()).map((i) => ({ ...i, attempts: attempts.get(i.localId) ?? i.attempts })));
          });
          notify();
          return { sent, remaining: (await exclusive(() => readOwned(userId))).length };
        } finally {
          flushing = null;
        }
      })();
      return flushing;
    },
    retryFailed: (userId) =>
      exclusive(async () => {
        const items = await readOwned(userId);
        await write(items.map((i) => (isFailed(i) ? { ...i, attempts: 0 } : i)));
        notify();
      }),
    removeFailed: (userId) =>
      exclusive(async () => {
        const items = await readOwned(userId);
        await write(items.filter((i) => !isFailed(i)));
        notify();
      }),
    clear: () =>
      exclusive(async () => {
        await storage.removeItem(ACTIVITY_QUEUE_KEY);
        notify();
      }),
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

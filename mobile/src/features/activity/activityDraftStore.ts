import { isSnapshot, type TrackerSnapshot } from './trackerReducer';
import type { KeyValueStorage } from './storage';

/** Depo anahtarı; çıkışta yerel veriyi temizleyen kod da bunu kullanır. */
export const ACTIVITY_DRAFT_KEY = '@4tree/activity-draft/v1';

type StoredDraft = { v: 2; userId: string | null; snapshot: TrackerSnapshot };

function isStored(value: unknown): value is StoredDraft {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.v === 2 && (v.userId === null || typeof v.userId === 'string') && isSnapshot(v.snapshot);
}

/** Kayıt sırasında periyodik yazılan taslak: uygulama kapanırsa kurtarılır. Taslak yazan kullanıcıya aittir. */
export type ActivityDraftStore = {
  save(snapshot: TrackerSnapshot, userId: string | null): Promise<void>;
  /**
   * Yok, bozuk ya da BAŞKA kullanıcıya aitse null döner; son iki durumda taslak sessizce silinir
   * (savunma derinliği: başka hesabın rotası gösterilmez).
   */
  load(userId: string | null): Promise<TrackerSnapshot | null>;
  clear(): Promise<void>;
};

export function createActivityDraftStore(storage: KeyValueStorage): ActivityDraftStore {
  return {
    async save(snapshot, userId) {
      const stored: StoredDraft = { v: 2, userId, snapshot };
      await storage.setItem(ACTIVITY_DRAFT_KEY, JSON.stringify(stored));
    },
    async load(userId) {
      const raw = await storage.getItem(ACTIVITY_DRAFT_KEY);
      if (raw === null) return null;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (isStored(parsed) && parsed.userId === userId) return parsed.snapshot;
      } catch {
        // Bozuk JSON aşağıda temizlenir.
      }
      await storage.removeItem(ACTIVITY_DRAFT_KEY);
      return null;
    },
    async clear() {
      await storage.removeItem(ACTIVITY_DRAFT_KEY);
    },
  };
}

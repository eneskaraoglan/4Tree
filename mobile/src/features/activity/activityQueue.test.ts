import { ServiceError } from '@/services';

import {
  ACTIVITY_QUEUE_KEY,
  createActivityQueue,
  flushItems,
  isFailed,
  MAX_SEND_ATTEMPTS,
  type QueuedActivity,
  type SaveActivityInput,
} from './activityQueue';
import { createMemoryStorage } from './storage';

const U = 'u1';

const input = (n: number): SaveActivityInput => ({
  type: 'run',
  durationSec: 600 + n,
  startedAt: `2026-10-10T07:0${n}:00.000Z`,
  distanceKm: 2 + n,
  route: [
    { lat: 41, lng: 29 },
    { lat: 41.01, lng: 29 },
  ],
});

const item = (n: number, attempts = 0): QueuedActivity => ({
  localId: `local-${n}`,
  userId: U,
  input: input(n),
  queuedAt: n,
  attempts,
});

describe('flushItems (saf mantık)', () => {
  it('sırayla gönderir ve hepsi başarılıysa kalan yoktur', async () => {
    const order: number[] = [];
    const result = await flushItems([item(1), item(2), item(3)], async (i) => {
      order.push(i.durationSec);
    });
    expect(order).toEqual([601, 602, 603]);
    expect(result).toEqual({ remaining: [], sent: 3 });
  });

  it('ağ hatasında durur: sıra bozulmaz, kalanlar yerinde kalır, deneme sayısı artmaz', async () => {
    const send = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new ServiceError('network', 'yok'))
      .mockResolvedValue(undefined);
    const result = await flushItems([item(1), item(2), item(3)], send);
    expect(send).toHaveBeenCalledTimes(2);
    expect(result.sent).toBe(1);
    expect(result.remaining.map((r) => r.localId)).toEqual(['local-2', 'local-3']);
    expect(result.remaining.map((r) => r.attempts)).toEqual([0, 0]);
  });

  it('oturum hatası (unauthenticated) da geçicidir: durur, sayılmaz', async () => {
    const send = jest.fn().mockRejectedValue(new ServiceError('unauthenticated', 'oturum yok'));
    const result = await flushItems([item(1), item(2)], send);
    expect(send).toHaveBeenCalledTimes(1);
    expect(result.remaining.map((r) => r.attempts)).toEqual([0, 0]);
  });

  it('invalid hatalı kayıt atlanır, deneme sayısı artar, silinmez; sonrakiler gönderilir', async () => {
    const send = jest
      .fn()
      .mockRejectedValueOnce(new ServiceError('invalid', 'bozuk'))
      .mockResolvedValue(undefined);
    const result = await flushItems([item(1), item(2)], send);
    expect(result.sent).toBe(1);
    expect(result.remaining).toEqual([{ ...item(1), attempts: 1 }]);
  });

  it('bilinmeyen hatada durur ve deneme sayısı artar', async () => {
    const send = jest.fn().mockRejectedValue(new Error('500'));
    const result = await flushItems([item(1), item(2)], send);
    expect(send).toHaveBeenCalledTimes(1);
    expect(result.remaining.map((r) => r.attempts)).toEqual([1, 0]);
  });

  it(`${MAX_SEND_ATTEMPTS} başarısız denemeden sonra giriş "gönderilemedi" olur ve otomatik gönderilmez`, async () => {
    const stuck = item(1, MAX_SEND_ATTEMPTS);
    expect(isFailed(stuck)).toBe(true);
    expect(isFailed(item(1, MAX_SEND_ATTEMPTS - 1))).toBe(false);
    const send = jest.fn().mockResolvedValue(undefined);
    const result = await flushItems([stuck, item(2)], send);
    expect(send).toHaveBeenCalledTimes(1);
    expect(result.sent).toBe(1);
    expect(result.remaining).toEqual([stuck]);
  });

  it('beşinci invalid hatadan sonra giriş "gönderilemedi" durumuna geçer', async () => {
    const send = jest.fn().mockRejectedValue(new ServiceError('invalid', 'bozuk'));
    const { remaining } = await flushItems([item(1, MAX_SEND_ATTEMPTS - 1)], send);
    expect(isFailed(remaining[0])).toBe(true);
  });
});

describe('createActivityQueue', () => {
  it('kuyruğa alır, listeler ve aynı localId ile çift kayıt oluşturmaz', async () => {
    const queue = createActivityQueue(createMemoryStorage(), () => 123);
    await queue.enqueue('local-a', input(1), U);
    await queue.enqueue('local-a', input(1), U);
    await queue.enqueue('local-b', input(2), U);
    const items = await queue.list(U);
    expect(items.map((i) => i.localId)).toEqual(['local-a', 'local-b']);
    expect(items[0]).toMatchObject({ queuedAt: 123, attempts: 0, userId: U });
  });

  it('kuyruk depoda kalır: yeni örnek aynı kayıtları görür (uygulama yeniden açılışı)', async () => {
    const storage = createMemoryStorage();
    await createActivityQueue(storage).enqueue('local-a', input(1), U);
    expect(await createActivityQueue(storage).list(U)).toHaveLength(1);
  });

  it('başka kullanıcının girişlerini göstermez, göndermez ve siler', async () => {
    const storage = createMemoryStorage();
    const queue = createActivityQueue(storage);
    await queue.enqueue('local-a', input(1), 'u-eski');
    await queue.enqueue('local-b', input(2), 'u-eski');
    const send = jest.fn().mockResolvedValue(undefined);

    expect(await queue.list(U)).toEqual([]);
    expect(await queue.flush(send, U)).toEqual({ sent: 0, remaining: 0 });
    expect(send).not.toHaveBeenCalled();
    expect(await storage.getItem(ACTIVITY_QUEUE_KEY)).toBeNull();
  });

  it('kullanıcıya göre ayırır: yalnız kendi girişlerini siler/bırakır', async () => {
    const queue = createActivityQueue(createMemoryStorage());
    await queue.enqueue('local-a', input(1), U);
    await queue.enqueue('local-b', input(2), 'u2');
    // u2'nin girişi eklenirken u1'in girişi de silinir: depo tek hesaba aittir.
    expect((await queue.list('u2')).map((i) => i.localId)).toEqual(['local-b']);
    expect(await queue.list(U)).toEqual([]);
  });

  it('flush başarılı gönderimden sonra kuyruğu boşaltır', async () => {
    const queue = createActivityQueue(createMemoryStorage());
    await queue.enqueue('local-a', input(1), U);
    await queue.enqueue('local-b', input(2), U);
    const send = jest.fn().mockResolvedValue(undefined);
    expect(await queue.flush(send, U)).toEqual({ sent: 2, remaining: 0 });
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenNthCalledWith(1, input(1));
    expect(await queue.list(U)).toEqual([]);
  });

  it('ağ yokken tekrar tekrar denemek deneme sayısını artırmaz; bağlantı gelince gider', async () => {
    const queue = createActivityQueue(createMemoryStorage());
    await queue.enqueue('local-a', input(1), U);
    const offline = jest.fn().mockRejectedValue(new ServiceError('network', 'yok'));
    for (let i = 0; i < MAX_SEND_ATTEMPTS + 2; i++) {
      expect(await queue.flush(offline, U)).toEqual({ sent: 0, remaining: 1 });
    }
    expect((await queue.list(U))[0].attempts).toBe(0);

    const online = jest.fn().mockResolvedValue(undefined);
    expect(await queue.flush(online, U)).toEqual({ sent: 1, remaining: 0 });
    // Gönderilen tekrar gönderilmez.
    await queue.flush(online, U);
    expect(online).toHaveBeenCalledTimes(1);
  });

  it('tekrarlayan gerçek hatalar girişi "gönderilemedi" yapar; yeniden dene sıfırlar ve gönderir', async () => {
    const queue = createActivityQueue(createMemoryStorage());
    await queue.enqueue('local-a', input(1), U);
    const broken = jest.fn().mockRejectedValue(new ServiceError('invalid', 'bozuk'));
    for (let i = 0; i < MAX_SEND_ATTEMPTS; i++) await queue.flush(broken, U);
    expect(broken).toHaveBeenCalledTimes(MAX_SEND_ATTEMPTS);
    expect(isFailed((await queue.list(U))[0])).toBe(true);

    // Artık otomatik denenmez.
    await queue.flush(broken, U);
    expect(broken).toHaveBeenCalledTimes(MAX_SEND_ATTEMPTS);

    await queue.retryFailed(U);
    expect((await queue.list(U))[0].attempts).toBe(0);
    const ok = jest.fn().mockResolvedValue(undefined);
    expect(await queue.flush(ok, U)).toEqual({ sent: 1, remaining: 0 });
  });

  it('removeFailed yalnız "gönderilemedi" girişlerini siler', async () => {
    const storage = createMemoryStorage();
    const queue = createActivityQueue(storage);
    await queue.enqueue('local-a', input(1), U);
    await queue.enqueue('local-b', input(2), U);
    const stored = JSON.parse((await storage.getItem(ACTIVITY_QUEUE_KEY)) as string) as QueuedActivity[];
    stored[0].attempts = MAX_SEND_ATTEMPTS;
    await storage.setItem(ACTIVITY_QUEUE_KEY, JSON.stringify(stored));

    await queue.removeFailed(U);
    expect((await queue.list(U)).map((i) => i.localId)).toEqual(['local-b']);
  });

  it('clear tüm kuyruğu siler ve abonelere haber verir', async () => {
    const queue = createActivityQueue(createMemoryStorage());
    await queue.enqueue('local-a', input(1), U);
    const listener = jest.fn();
    queue.subscribe(listener);
    await queue.clear();
    expect(await queue.list()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('eşzamanlı iki flush aynı işleme katılır: çift gönderim yok', async () => {
    const queue = createActivityQueue(createMemoryStorage());
    await queue.enqueue('local-a', input(1), U);
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const send = jest.fn(() => gate);
    const first = queue.flush(send, U);
    const second = queue.flush(send, U);
    await new Promise((resolve) => setTimeout(resolve, 0));
    release();
    const [a, b] = await Promise.all([first, second]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
    expect(await queue.list(U)).toEqual([]);
  });

  it('gönderim sürerken eklenen yeni kayıt kaybolmaz', async () => {
    const queue = createActivityQueue(createMemoryStorage());
    await queue.enqueue('local-a', input(1), U);
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const flushing = queue.flush(() => gate, U);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await queue.enqueue('local-b', input(2), U);
    release();
    await flushing;
    expect((await queue.list(U)).map((i) => i.localId)).toEqual(['local-b']);
  });

  it('abonelere değişiklikte haber verir', async () => {
    const queue = createActivityQueue(createMemoryStorage());
    const listener = jest.fn();
    const unsubscribe = queue.subscribe(listener);
    await queue.enqueue('local-a', input(1), U);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    await queue.enqueue('local-b', input(2), U);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('bozuk ya da eski biçimli depo içeriğini yok sayar', async () => {
    const storage = createMemoryStorage({ [ACTIVITY_QUEUE_KEY]: '{bozuk' });
    const queue = createActivityQueue(storage);
    expect(await queue.list(U)).toEqual([]);
    await storage.setItem(ACTIVITY_QUEUE_KEY, JSON.stringify([{ localId: 'x', input: input(1), queuedAt: 1, attempts: 0 }]));
    expect(await queue.list(U)).toEqual([]);
    await queue.enqueue('local-a', input(1), U);
    expect(await queue.list(U)).toHaveLength(1);
  });
});

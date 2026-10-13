import { createActivityDraftStore } from './activityDraftStore';
import { createActivityQueue } from './activityQueue';
import { clearActivityLocalData } from './clearActivityLocalData';
import type { KeyValueStorage } from './storage';

function trackedStorage() {
  const data = new Map<string, string>();
  const storage: KeyValueStorage = {
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    removeItem: async (k) => void data.delete(k),
  };
  return { storage, data };
}

const input = { type: 'run' as const, durationSec: 60, route: [], startedAt: '2026-10-09T06:00:00Z', distanceKm: 1 };

describe('clearActivityLocalData', () => {
  it('taslağı ve bekleyen yükleme kuyruğunu siler, sunucuya hiçbir şey göndermez', async () => {
    const { storage, data } = trackedStorage();
    const queue = createActivityQueue(storage);
    await queue.enqueue('a', input as never, 'u1');
    await queue.enqueue('b', input as never, 'u1');
    await createActivityDraftStore(storage).save({ phase: 'running' } as never, 'u1');
    expect(await queue.list()).toHaveLength(2);
    expect(data.size).toBe(2);

    await clearActivityLocalData(storage);

    expect(await queue.list()).toHaveLength(0);
    expect(await createActivityDraftStore(storage).load('u1')).toBeNull();
    expect(data.size).toBe(0);
  });

  it('boş depoda hata vermez', async () => {
    await expect(clearActivityLocalData(trackedStorage().storage)).resolves.toBeUndefined();
  });
});

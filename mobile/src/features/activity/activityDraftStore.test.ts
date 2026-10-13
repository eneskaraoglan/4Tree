import { ACTIVITY_DRAFT_KEY, createActivityDraftStore } from './activityDraftStore';
import { createMemoryStorage } from './storage';
import type { TrackerSnapshot } from './trackerReducer';

const snapshot: TrackerSnapshot = {
  v: 1,
  startedAt: 1_700_000_000_000,
  activeMs: 600_000,
  distanceM: 1500,
  segment: 1,
  points: [
    { lat: 41, lng: 29, t: 1_700_000_001_000, seg: 0 },
    { lat: 41.001, lng: 29, t: 1_700_000_031_000, seg: 1 },
  ],
  savedAt: 1_700_000_600_000,
};

describe('activityDraftStore', () => {
  it('yazar, okur ve siler', async () => {
    const store = createActivityDraftStore(createMemoryStorage());
    expect(await store.load('u1')).toBeNull();
    await store.save(snapshot, 'u1');
    expect(await store.load('u1')).toEqual(snapshot);
    await store.clear();
    expect(await store.load('u1')).toBeNull();
  });

  it('yeni yazım eskisinin üzerine yazar (tek taslak)', async () => {
    const store = createActivityDraftStore(createMemoryStorage());
    await store.save(snapshot, 'u1');
    await store.save({ ...snapshot, distanceM: 3000 }, 'u1');
    expect((await store.load('u1'))?.distanceM).toBe(3000);
  });

  it('başka kullanıcının taslağını göstermez ve siler (savunma derinliği)', async () => {
    const storage = createMemoryStorage();
    const store = createActivityDraftStore(storage);
    await store.save(snapshot, 'u1');
    expect(await store.load('u2')).toBeNull();
    expect(await storage.getItem(ACTIVITY_DRAFT_KEY)).toBeNull();
    // Sahibi de artık göremez: veri yok edildi.
    expect(await store.load('u1')).toBeNull();
  });

  it('oturumsuz (null) taslak yalnız oturumsuz okunur', async () => {
    const store = createActivityDraftStore(createMemoryStorage());
    await store.save(snapshot, null);
    expect(await store.load('u1')).toBeNull();
  });

  it('bozuk taslağı null sayar ve temizler', async () => {
    const storage = createMemoryStorage({ [ACTIVITY_DRAFT_KEY]: '{"v":2,"x":' });
    const store = createActivityDraftStore(storage);
    expect(await store.load('u1')).toBeNull();
    expect(await storage.getItem(ACTIVITY_DRAFT_KEY)).toBeNull();
  });

  it('şeması uymayan ya da eski biçimdeki taslağı reddeder ve siler', async () => {
    const legacy = createMemoryStorage({ [ACTIVITY_DRAFT_KEY]: JSON.stringify(snapshot) });
    expect(await createActivityDraftStore(legacy).load('u1')).toBeNull();
    expect(await legacy.getItem(ACTIVITY_DRAFT_KEY)).toBeNull();
    const wrong = createMemoryStorage({ [ACTIVITY_DRAFT_KEY]: JSON.stringify({ v: 2, userId: 'u1', snapshot: { v: 1 } }) });
    expect(await createActivityDraftStore(wrong).load('u1')).toBeNull();
  });
});

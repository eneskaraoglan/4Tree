import { supabase } from './supabaseClient';
import { createSupabaseActivityService } from './supabaseActivityService';
import { setupFakeSupabase } from './supabaseTestUtils';

jest.mock('./supabaseClient', () => ({
  supabase: { auth: { getSession: jest.fn() }, from: jest.fn() },
}));

const getSession = supabase.auth.getSession as jest.Mock;
const from = supabase.from as jest.Mock;
const service = createSupabaseActivityService();

/** Saat sabit: gelecek tarih kontrolü deterministik olsun. */
const NOW = Date.parse('2026-10-10T12:00:00Z');
beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});
afterEach(() => {
  jest.restoreAllMocks();
});

/** little-endian EWKB (SRID 4326) LineString hex; PostgREST geography'yi böyle de döndürebilir. */
function ewkbHex(points: [lng: number, lat: number][]): string {
  const buffer = new ArrayBuffer(1 + 4 + 4 + 4 + points.length * 16);
  const view = new DataView(buffer);
  view.setUint8(0, 1);
  view.setUint32(1, 0x20000002, true);
  view.setUint32(5, 4326, true);
  view.setUint32(9, points.length, true);
  points.forEach(([lng, lat], i) => {
    view.setFloat64(13 + i * 16, lng, true);
    view.setFloat64(21 + i * 16, lat, true);
  });
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

const row = {
  id: 'run-1',
  type: 'walk',
  distance_meters: 5000,
  duration_secs: 1650,
  seeds_earned: 0,
  started_at: '2026-10-09T06:40:00Z',
  place: 'Belgrad Ormanı',
  route: { type: 'LineString', coordinates: [[29.0, 41.1], [29.001, 41.101]] },
};

const input = {
  type: 'run' as const,
  durationSec: 600,
  startedAt: '2026-10-10T06:00:00Z',
  place: ' Belgrad ',
  route: [{ lat: 41.1, lng: 29.0 }, { lat: 41.101, lng: 29.002 }],
};

describe('getActivities', () => {
  it('runs sütunlarını Activity alanlarına eşler (GeoJSON [lng,lat] -> {lat,lng})', async () => {
    const fake = setupFakeSupabase(from, getSession, { tables: { runs: { data: [row] } } });
    await expect(service.getActivities()).resolves.toEqual([
      {
        id: 'run-1',
        type: 'walk',
        distanceKm: 5,
        durationSec: 1650,
        paceSecPerKm: 330,
        startedAt: '2026-10-09T06:40:00Z',
        place: 'Belgrad Ormanı',
        route: [{ lat: 41.1, lng: 29.0 }, { lat: 41.101, lng: 29.001 }],
        treesEarned: 0,
      },
    ]);
    const query = fake.on('runs')[0];
    expect(fake.args(query, 'eq')).toEqual(['user_id', 'user-1']);
    expect(fake.args(query, 'order')).toEqual(['started_at', { ascending: false }]);
    expect(fake.args(query, 'limit')).toEqual([30]);
    expect(fake.args(query, 'select')).toEqual([
      'id, type, distance_meters, duration_secs, seeds_earned, started_at, place, route',
    ]);
  });

  it('route hex EWKB olarak gelirse de ayrıştırılır; bigint mesafe string olabilir', async () => {
    setupFakeSupabase(from, getSession, {
      tables: { runs: { data: [{ ...row, distance_meters: '5000', route: ewkbHex([[29, 41], [29.001, 41.001]]) }] } },
    });
    const [activity] = await service.getActivities();
    expect(activity.distanceKm).toBe(5);
    expect(activity.route).toEqual([{ lat: 41, lng: 29 }, { lat: 41.001, lng: 29.001 }]);
  });

  it('rota null ise boş dizi, mesafe 0 ise tempo 0', async () => {
    setupFakeSupabase(from, getSession, { tables: { runs: { data: [{ ...row, route: null, distance_meters: 0 }] } } });
    const [activity] = await service.getActivities();
    expect(activity.route).toEqual([]);
    expect(activity.paceSecPerKm).toBe(0);
  });

  it('listede tek bozuk rotalı satır listeyi düşürmez: o satır route [] gelir, uyarı yazılır', async () => {
    const fake = setupFakeSupabase(from, getSession, {
      tables: { runs: { data: [row, { ...row, id: 'run-2', route: 'LINESTRING(0 0, 1 1)' }] } },
    });
    const activities = await service.getActivities();
    expect(activities.map((a) => a.id)).toEqual(['run-1', 'run-2']);
    expect(activities[0].route).toHaveLength(2);
    expect(activities[1].route).toEqual([]);
    expect(fake.warn).toHaveBeenCalledWith(expect.stringContaining('run-2'), expect.anything());
  });

  it('kayıt yoksa boş liste döner (mock yok)', async () => {
    setupFakeSupabase(from, getSession, { tables: { runs: { data: [] } } });
    await expect(service.getActivities()).resolves.toEqual([]);
  });

  it('oturum yoksa unauthenticated', async () => {
    setupFakeSupabase(from, getSession, { userId: null });
    await expect(service.getActivities()).rejects.toMatchObject({ code: 'unauthenticated' });
    expect(from).not.toHaveBeenCalled();
  });

  it('Postgrest hatası ServiceError olur, iç mesaj sızmaz', async () => {
    setupFakeSupabase(from, getSession, { tables: { runs: { error: { code: '', message: 'secret' } } } });
    const error = await service.getActivities().catch((e) => e);
    expect(error).toMatchObject({ name: 'ServiceError', code: 'network' });
    expect(error.message).not.toContain('secret');
  });
});

describe('getActivity', () => {
  it('bulunursa döner', async () => {
    const fake = setupFakeSupabase(from, getSession, { tables: { runs: { data: row } } });
    await expect(service.getActivity('run-1')).resolves.toMatchObject({ id: 'run-1', distanceKm: 5 });
    expect(fake.all(fake.on('runs')[0], 'eq')).toEqual([['id', 'run-1'], ['user_id', 'user-1']]);
  });

  it('bulunamazsa ve kimlik bozuksa null', async () => {
    setupFakeSupabase(from, getSession, { tables: { runs: { data: null } } });
    await expect(service.getActivity('x')).resolves.toBeNull();
    setupFakeSupabase(from, getSession, { tables: { runs: { error: { code: '22P02' } } } });
    await expect(service.getActivity('bad')).resolves.toBeNull();
  });

  it('tekil okumada tanınmayan rota biçimi sessizce [] olmaz: ServiceError(invalid)', async () => {
    setupFakeSupabase(from, getSession, { tables: { runs: { data: { ...row, route: 'LINESTRING(0 0, 1 1)' } } } });
    await expect(service.getActivity('run-1')).rejects.toMatchObject({ name: 'ServiceError', code: 'invalid' });
  });

  it('oturum yoksa unauthenticated, hata ServiceError', async () => {
    setupFakeSupabase(from, getSession, { userId: null });
    await expect(service.getActivity('run-1')).rejects.toMatchObject({ code: 'unauthenticated' });
    setupFakeSupabase(from, getSession, { tables: { runs: { error: { code: '' } } } });
    await expect(service.getActivity('run-1')).rejects.toMatchObject({ code: 'network' });
  });
});

describe('saveActivity', () => {
  it('rotayı EWKT LINESTRING (lng lat) olarak yazar; mesafeyi istemci göndermez', async () => {
    const fake = setupFakeSupabase(from, getSession, { tables: { runs: { data: row } } });
    const saved = await service.saveActivity({ ...input, distanceKm: 99 });
    expect(saved.id).toBe('run-1');
    const [payload] = fake.args(fake.on('runs')[0], 'insert') as [Record<string, unknown>];
    expect(payload).toEqual({
      user_id: 'user-1',
      type: 'run',
      duration_secs: 600,
      started_at: '2026-10-10T06:00:00.000Z',
      place: 'Belgrad',
      route: 'SRID=4326;LINESTRING(29.0000000 41.1000000, 29.0020000 41.1010000)',
    });
    expect(payload).not.toHaveProperty('distance_meters');
  });

  it('startedAt UTC ISO biçimine normalize edilir; verilmezse şimdi', async () => {
    const fake = setupFakeSupabase(from, getSession, { tables: { runs: { data: row } } });
    await service.saveActivity({ ...input, startedAt: '2026-10-10T09:00:00+03:00' });
    await service.saveActivity({ ...input, startedAt: undefined });
    const [first, second] = fake.on('runs').map((q) => (fake.args(q, 'insert') as [{ started_at: string }])[0].started_at);
    expect(first).toBe('2026-10-10T06:00:00.000Z');
    expect(second).toBe('2026-10-10T12:00:00.000Z');
  });

  it('rota 2000 noktayı aşarsa eşit aralıklı örneklenir, uçlar korunur', async () => {
    const fake = setupFakeSupabase(from, getSession, { tables: { runs: { data: row } } });
    const route = Array.from({ length: 5000 }, (_, i) => ({ lat: 41 + i / 100000, lng: 29 + i / 100000 }));
    await service.saveActivity({ ...input, route });
    const [{ route: wkt }] = fake.args(fake.on('runs')[0], 'insert') as [{ route: string }];
    const pairs = wkt.replace('SRID=4326;LINESTRING(', '').replace(')', '').split(', ');
    expect(pairs).toHaveLength(2000);
    expect(pairs[0]).toBe('29.0000000 41.0000000');
    expect(pairs[1999]).toBe('29.0499900 41.0499900');
  });

  it('2000 nokta ve altı olduğu gibi yazılır', async () => {
    const fake = setupFakeSupabase(from, getSession, { tables: { runs: { data: row } } });
    const route = Array.from({ length: 2000 }, (_, i) => ({ lat: 41 + i / 100000, lng: 29 }));
    await service.saveActivity({ ...input, route });
    const [{ route: wkt }] = fake.args(fake.on('runs')[0], 'insert') as [{ route: string }];
    expect(wkt.split(', ')).toHaveLength(2000);
  });

  it('oturum yoksa unauthenticated, yazma yapılmaz', async () => {
    setupFakeSupabase(from, getSession, { userId: null });
    await expect(service.saveActivity(input)).rejects.toMatchObject({ code: 'unauthenticated' });
    expect(from).not.toHaveBeenCalled();
  });

  it.each([
    ['süre 0', { durationSec: 0 }],
    ['süre 1 (sunucu hız kontrolünü atlatır)', { durationSec: 1 }],
    ['süre NaN', { durationSec: NaN }],
    ['süre 1.4 (yuvarlayınca 1)', { durationSec: 1.4 }],
    ['tek nokta', { route: [{ lat: 41, lng: 29 }] }],
    ['boş rota', { route: [] }],
    ['enlem aralık dışı', { route: [{ lat: 91, lng: 29 }, { lat: 41, lng: 29 }] }],
    ['boylam NaN', { route: [{ lat: 41, lng: NaN }, { lat: 41, lng: 29 }] }],
    ['tarih bozuk', { startedAt: 'dün' }],
    ['gelecek tarih', { startedAt: '2026-10-11T12:00:00Z' }],
    ['uzun yer adı', { place: 'a'.repeat(81) }],
    ['yer adında kontrol karakteri', { place: 'Belgrad\u0007' }],
    ['yer adında bidi karakteri', { place: 'Belgrad\u202E' }],
    ['yer adında sıfır genişlikli karakter', { place: 'Bel\u200Bgrad' }],
  ])('geçersiz giriş (%s) invalid, yazma yapılmaz', async (_name, patch) => {
    setupFakeSupabase(from, getSession);
    await expect(service.saveActivity({ ...input, ...patch })).rejects.toMatchObject({ code: 'invalid' });
    expect(from).not.toHaveBeenCalled();
  });

  it('sunucu doğrulaması (anti-cheat P0001) invalid olur, mesajı sızmaz', async () => {
    setupFakeSupabase(from, getSession, {
      tables: { runs: { error: { code: 'P0001', message: 'Anti-Cheat: Araç kullanımı' } } },
    });
    const error = await service.saveActivity(input).catch((e) => e);
    expect(error).toMatchObject({ name: 'ServiceError', code: 'invalid' });
    expect(error.message).not.toContain('Anti-Cheat');
  });

  it('ağ hatası network, veri dönmezse network', async () => {
    setupFakeSupabase(from, getSession, { tables: { runs: { error: { message: 'Failed to fetch' } } } });
    await expect(service.saveActivity(input)).rejects.toMatchObject({ code: 'network' });
    setupFakeSupabase(from, getSession, { tables: { runs: { data: null } } });
    await expect(service.saveActivity(input)).rejects.toMatchObject({ code: 'network' });
  });
});

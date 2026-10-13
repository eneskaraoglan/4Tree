import { MAX_ZONES_PER_USER, ZONE_LABEL_MAX_LENGTH } from '../privacyZoneRules';

import { supabase } from './supabaseClient';
import { createSupabasePrivacyService } from './supabasePrivacyService';
import { setupFakeSupabase } from './supabaseTestUtils';

jest.mock('./supabaseClient', () => ({
  supabase: { auth: { getSession: jest.fn() }, from: jest.fn() },
}));

const getSession = supabase.auth.getSession as jest.Mock;
const from = supabase.from as jest.Mock;
const service = createSupabasePrivacyService();

const zoneRow = { id: 'z1', label: 'Ev', radius_m: 250, center_lat: '41.1432', center_lng: 29.0058 };
const tables = { users_profile: { data: { visibility: 'private' } }, privacy_zones: { data: [zoneRow] } };
const zone = { label: ' Ev ', lat: 41.1432, lng: 29.0058, radiusM: 250 };

describe('getSettings', () => {
  it('görünürlük ve bölgeleri okur (center_lat/center_lng)', async () => {
    const fake = setupFakeSupabase(from, getSession, { tables });
    await expect(service.getSettings()).resolves.toEqual({
      visibility: 'private',
      zones: [{ id: 'z1', label: 'Ev', lat: 41.1432, lng: 29.0058, radiusM: 250 }],
    });
    expect(fake.args(fake.on('privacy_zones')[0], 'select')).toEqual(['id, label, radius_m, center_lat, center_lng']);
    expect(fake.args(fake.on('privacy_zones')[0], 'eq')).toEqual(['user_id', 'user-1']);
  });

  it("profil satırı yoksa 'friends' yedeği vermez, not_found", async () => {
    setupFakeSupabase(from, getSession, { tables: { ...tables, users_profile: { data: null } } });
    await expect(service.getSettings()).rejects.toMatchObject({ code: 'not_found' });
  });

  it('bilinmeyen visibility değeri not_found', async () => {
    setupFakeSupabase(from, getSession, { tables: { ...tables, users_profile: { data: { visibility: 'x' } } } });
    await expect(service.getSettings()).rejects.toMatchObject({ code: 'not_found' });
  });

  it('oturum yoksa unauthenticated', async () => {
    setupFakeSupabase(from, getSession, { userId: null });
    await expect(service.getSettings()).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it.each(['users_profile', 'privacy_zones'])('%s hatası network, iç mesaj sızmaz', async (table) => {
    setupFakeSupabase(from, getSession, { tables: { ...tables, [table]: { error: { code: '', message: 'secret' } } } });
    const error = await service.getSettings().catch((e) => e);
    expect(error).toMatchObject({ name: 'ServiceError', code: 'network' });
    expect(error.message).not.toContain('secret');
  });
});

describe('setVisibility', () => {
  it('günceller ve güncel ayarı okur', async () => {
    const fake = setupFakeSupabase(from, getSession, {
      tables: { ...tables, users_profile: [{ data: [{ id: 'user-1' }] }, { data: { visibility: 'friends' } }] },
    });
    await expect(service.setVisibility('friends')).resolves.toMatchObject({ visibility: 'friends' });
    const update = fake.on('users_profile')[0];
    expect(fake.args(update, 'update')).toEqual([{ visibility: 'friends' }]);
    expect(fake.args(update, 'eq')).toEqual(['id', 'user-1']);
  });

  it('geçersiz değer invalid, yazma yok', async () => {
    setupFakeSupabase(from, getSession, { tables });
    await expect(service.setVisibility('everyone' as never)).rejects.toMatchObject({ code: 'invalid' });
    expect(from).not.toHaveBeenCalled();
  });

  it('oturum yoksa unauthenticated; satır güncellenmediyse not_found; hata network', async () => {
    setupFakeSupabase(from, getSession, { userId: null });
    await expect(service.setVisibility('public')).rejects.toMatchObject({ code: 'unauthenticated' });
    setupFakeSupabase(from, getSession, { tables: { ...tables, users_profile: { data: [] } } });
    await expect(service.setVisibility('public')).rejects.toMatchObject({ code: 'not_found' });
    setupFakeSupabase(from, getSession, { tables: { ...tables, users_profile: { error: { code: '' } } } });
    await expect(service.setVisibility('public')).rejects.toMatchObject({ code: 'network' });
  });
});

describe('addZone', () => {
  /** Sıra: bölge sayısı sorgusu, insert, güncel bölge listesi. */
  const zoneTables = (count = 0) => ({
    ...tables,
    privacy_zones: [{ count }, { data: null }, { data: [zoneRow] }],
  });

  it('merkezi EWKT SRID=4326;POINT(lng lat) yazar, etiketi kırpar', async () => {
    const fake = setupFakeSupabase(from, getSession, { tables: zoneTables() });
    await expect(service.addZone(zone)).resolves.toMatchObject({ visibility: 'private' });
    expect(fake.args(fake.on('privacy_zones')[1], 'insert')).toEqual([
      { user_id: 'user-1', label: 'Ev', center: 'SRID=4326;POINT(29.0058000 41.1432000)', radius_m: 250 },
    ]);
    expect(fake.getSessionCalls()).toBe(1);
  });

  it.each([
    ['boş etiket', { label: '   ' }],
    ['yalnız sıfır genişlikli karakterler', { label: '\u200B\u200D\uFEFF' }],
    ['boşluk + görünmez karakter', { label: ' \u2060 ' }],
    ['uzun etiket', { label: 'a'.repeat(ZONE_LABEL_MAX_LENGTH + 1) }],
    ['kontrol karakteri', { label: 'Ev\u0000' }],
    ['satır sonu', { label: 'Ev\nİş' }],
    ['bidi override', { label: 'Ev\u202Egnp' }],
    ['bidi isolate', { label: '\u2066Ev' }],
    ['sıfır genişlikli boşluk', { label: 'E\u200Bv' }],
    ['yumuşak tire', { label: 'E\u00ADv' }],
    ['satır ayracı U+2028', { label: 'Ev\u2028İş' }],
    ['izinsiz yarıçap', { radiusM: 300 }],
    ['sıfır yarıçap', { radiusM: 0 }],
    ['enlem > 90', { lat: 90.1 }],
    ['enlem NaN', { lat: NaN }],
    ['boylam < -180', { lng: -180.5 }],
  ])('%s invalid, yazma yok', async (_name, patch) => {
    setupFakeSupabase(from, getSession, { tables: zoneTables() });
    await expect(service.addZone({ ...zone, ...patch })).rejects.toMatchObject({ code: 'invalid' });
    expect(from).not.toHaveBeenCalled();
  });

  it('boş etiket mesajı "ad ver", görünmez karakter yalnızken de aynı', async () => {
    setupFakeSupabase(from, getSession, { tables: zoneTables() });
    const error = await service.addZone({ ...zone, label: '\u200B' }).catch((e) => e);
    expect(error.message).toBe('Bölgeye bir ad ver.');
  });

  it('uzunluk kod noktasıyla sayılır: sınırdaki emoji/Türkçe etiket kabul edilir', async () => {
    setupFakeSupabase(from, getSession, { tables: zoneTables() });
    const label = 'Çığır'.padEnd(ZONE_LABEL_MAX_LENGTH - 2, 'ö') + '🌳🌳';
    expect([...label]).toHaveLength(ZONE_LABEL_MAX_LENGTH);
    await expect(service.addZone({ ...zone, label })).resolves.toBeDefined();
  });

  it(`kullanıcı başına ${MAX_ZONES_PER_USER} bölge sınırı: dolunca invalid, yazma yok`, async () => {
    const fake = setupFakeSupabase(from, getSession, { tables: zoneTables(MAX_ZONES_PER_USER) });
    await expect(service.addZone(zone)).rejects.toMatchObject({ code: 'invalid' });
    expect(fake.on('privacy_zones')).toHaveLength(1);
    expect(fake.args(fake.on('privacy_zones')[0], 'select')).toEqual(['id', { count: 'exact', head: true }]);
  });

  it('sınırın bir altında ekleme çalışır', async () => {
    setupFakeSupabase(from, getSession, { tables: zoneTables(MAX_ZONES_PER_USER - 1) });
    await expect(service.addZone(zone)).resolves.toBeDefined();
  });

  it('sayım dönmezse network', async () => {
    setupFakeSupabase(from, getSession, { tables: { ...tables, privacy_zones: { count: null } } });
    await expect(service.addZone(zone)).rejects.toMatchObject({ code: 'network' });
  });

  it('oturum yoksa unauthenticated; insert hatası ServiceError', async () => {
    setupFakeSupabase(from, getSession, { userId: null });
    await expect(service.addZone(zone)).rejects.toMatchObject({ code: 'unauthenticated' });
    setupFakeSupabase(from, getSession, {
      tables: { ...tables, privacy_zones: [{ count: 0 }, { error: { code: '23514', message: 'secret' } }] },
    });
    const error = await service.addZone(zone).catch((e) => e);
    expect(error).toMatchObject({ name: 'ServiceError', code: 'invalid' });
    expect(error.message).not.toContain('secret');
  });
});

describe('removeZone', () => {
  it('siler ve güncel ayarı döner', async () => {
    const fake = setupFakeSupabase(from, getSession, {
      tables: { ...tables, privacy_zones: [{ data: [{ id: 'z1' }] }, { data: [] }] },
    });
    await expect(service.removeZone('z1')).resolves.toEqual({ visibility: 'private', zones: [] });
    expect(fake.all(fake.on('privacy_zones')[0], 'eq')).toEqual([['id', 'z1'], ['user_id', 'user-1']]);
  });

  it('olmayan bölge / bozuk kimlik not_found', async () => {
    setupFakeSupabase(from, getSession, { tables: { ...tables, privacy_zones: { data: [] } } });
    await expect(service.removeZone('nope')).rejects.toMatchObject({ code: 'not_found' });
    setupFakeSupabase(from, getSession, { tables: { ...tables, privacy_zones: { error: { code: '22P02' } } } });
    await expect(service.removeZone('bad')).rejects.toMatchObject({ code: 'not_found' });
  });

  it('oturum yoksa unauthenticated; hata network', async () => {
    setupFakeSupabase(from, getSession, { userId: null });
    await expect(service.removeZone('z1')).rejects.toMatchObject({ code: 'unauthenticated' });
    setupFakeSupabase(from, getSession, { tables: { ...tables, privacy_zones: { error: { code: '' } } } });
    await expect(service.removeZone('z1')).rejects.toMatchObject({ code: 'network' });
  });
});

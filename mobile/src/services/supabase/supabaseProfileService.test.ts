import { supabase } from './supabaseClient';
import { createSupabaseProfileService } from './supabaseProfileService';
import { setupFakeSupabase } from './supabaseTestUtils';

jest.mock('./supabaseClient', () => ({
  supabase: { auth: { getSession: jest.fn() }, from: jest.fn() },
}));

const getSession = supabase.auth.getSession as jest.Mock;
const from = supabase.from as jest.Mock;
const service = createSupabaseProfileService();

const row = {
  id: 'user-1',
  display_name: 'Ayşe Yılmaz',
  avatar_initial: 'A',
  total_distance_m: 45500,
  total_trees: 2,
  active_days: 7,
  seed_balance: 2,
  created_at: '2026-03-14T09:30:00.123456+00:00',
};

describe('supabaseProfileService', () => {
  it('users_profile sütunlarını Profile alanlarına eşler', async () => {
    const fake = setupFakeSupabase(from, getSession, { tables: { users_profile: { data: row } } });
    await expect(service.getProfile()).resolves.toEqual({
      id: 'user-1',
      name: 'Ayşe Yılmaz',
      avatarInitial: 'A',
      level: 'seed',
      totalKm: 45.5,
      totalTrees: 2,
      activeDays: 7,
      joinedAt: '2026-03-14T09:30:00.123456+00:00',
    });
    expect(fake.args(fake.on('users_profile')[0], 'eq')).toEqual(['id', 'user-1']);
  });

  it('avatar_initial boşsa addan türetir', async () => {
    setupFakeSupabase(from, getSession, { tables: { users_profile: { data: { ...row, avatar_initial: '', display_name: 'mert' } } } });
    await expect(service.getProfile()).resolves.toMatchObject({ name: 'mert', avatarInitial: 'M' });
  });

  it('satır yoksa not_found', async () => {
    setupFakeSupabase(from, getSession, { tables: { users_profile: { data: null } } });
    await expect(service.getProfile()).rejects.toMatchObject({ code: 'not_found' });
  });

  it('oturum yoksa unauthenticated', async () => {
    setupFakeSupabase(from, getSession, { userId: null });
    await expect(service.getProfile()).rejects.toMatchObject({ code: 'unauthenticated' });
    await expect(service.getLevelProgress()).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('hata ServiceError(network) olur, iç mesaj sızmaz', async () => {
    setupFakeSupabase(from, getSession, { tables: { users_profile: { error: { code: '', message: 'secret' } } } });
    const error = await service.getProfile().catch((e) => e);
    expect(error).toMatchObject({ name: 'ServiceError', code: 'network' });
    expect(error.message).not.toContain('secret');
  });

  it('getLevelProgress toplam km’den hesaplar (60 km = 3 ağaç = fidan)', async () => {
    setupFakeSupabase(from, getSession, { tables: { users_profile: { data: { ...row, total_distance_m: 60000 } } } });
    await expect(service.getLevelProgress()).resolves.toEqual({ level: 'sapling', nextLevel: 'tree', progress: 0 });
  });

  it('sunucudan gelmeyen level yok sayılır: seviye toplam km’den hesaplanır', async () => {
    setupFakeSupabase(from, getSession, { tables: { users_profile: { data: { ...row, level: 'forest' } } } });
    await expect(service.getProfile()).resolves.toMatchObject({ level: 'seed' });
  });

  it('bigint sütunlar string gelebilir (PostgREST)', async () => {
    setupFakeSupabase(from, getSession, { tables: { users_profile: { data: { ...row, total_distance_m: '1500000' } } } });
    await expect(service.getProfile()).resolves.toMatchObject({ totalKm: 1500, level: 'forest' });
    await expect(service.getLevelProgress()).resolves.toEqual({ level: 'forest', nextLevel: null, progress: 1 });
  });

  it('select("*") yerine açık sütunlar okunur', async () => {
    const fake = setupFakeSupabase(from, getSession, { tables: { users_profile: { data: row } } });
    await service.getProfile();
    const [columns] = fake.args(fake.on('users_profile')[0], 'select') as [string];
    expect(columns).not.toBe('*');
    expect(columns.split(', ')).toEqual(
      expect.arrayContaining(['id', 'display_name', 'avatar_initial', 'total_distance_m', 'total_trees', 'active_days', 'created_at']),
    );
  });

  it('created_at yoksa joinedAt da yoktur', async () => {
    setupFakeSupabase(from, getSession, { tables: { users_profile: { data: { ...row, created_at: null } } } });
    expect((await service.getProfile()).joinedAt).toBeUndefined();
  });

  it('avatar_initial boşsa Türkçe büyük harfle türetilir (ismail -> İ)', async () => {
    setupFakeSupabase(from, getSession, { tables: { users_profile: { data: { ...row, avatar_initial: '', display_name: 'ismail' } } } });
    await expect(service.getProfile()).resolves.toMatchObject({ avatarInitial: 'İ' });
  });
});

describe('supabaseProfileService.updateProfile', () => {
  const updatedRow = { ...row, display_name: 'Mert Kaya', avatar_initial: 'M' };

  it('yalnız display_name ve avatar_initial gönderir; id oturum kullanıcısıdır; güncel profili döner', async () => {
    const fake = setupFakeSupabase(from, getSession, { tables: { users_profile: { data: updatedRow } } });
    const result = await service.updateProfile({ name: '  Mert Kaya ', avatarInitial: 'm' });

    expect(result).toMatchObject({ id: 'user-1', name: 'Mert Kaya', avatarInitial: 'M', totalKm: 45.5 });
    const [query] = fake.on('users_profile');
    expect(fake.args(query, 'update')).toEqual([{ display_name: 'Mert Kaya', avatar_initial: 'M' }]);
    expect(fake.args(query, 'eq')).toEqual(['id', 'user-1']);
    const [columns] = fake.args(query, 'select') as [string];
    expect(columns).not.toBe('*');
  });

  it('verilmeyen alan gönderilmez', async () => {
    const fake = setupFakeSupabase(from, getSession, { tables: { users_profile: { data: updatedRow } } });
    await service.updateProfile({ name: 'Mert Kaya' });
    expect(fake.args(fake.on('users_profile')[0], 'update')).toEqual([{ display_name: 'Mert Kaya' }]);

    const fake2 = setupFakeSupabase(from, getSession, { tables: { users_profile: { data: updatedRow } } });
    await service.updateProfile({ avatarInitial: 'i' });
    expect(fake2.args(fake2.on('users_profile')[0], 'update')).toEqual([{ avatar_initial: 'İ' }]);
  });

  it('korumalı sütunlar (toplam km, ağaç, tohum, id) istekte olsa bile gönderilmez', async () => {
    const fake = setupFakeSupabase(from, getSession, { tables: { users_profile: { data: updatedRow } } });
    const hostile = { name: 'Mert Kaya', total_distance_m: 1e9, seed_balance: 999, id: 'baska' } as never;
    await service.updateProfile(hostile);
    const [changes] = fake.args(fake.on('users_profile')[0], 'update') as [Record<string, unknown>];
    expect(Object.keys(changes)).toEqual(['display_name']);
  });

  it('geçersiz giriş ağa çıkmadan ServiceError(invalid) olur', async () => {
    const fake = setupFakeSupabase(from, getSession, { tables: { users_profile: { data: updatedRow } } });
    for (const patch of [{ name: 'A' }, { name: 'x'.repeat(41) }, { name: 'Ay\u200bşe' }, { avatarInitial: 'AB' }, { avatarInitial: '' }]) {
      await expect(service.updateProfile(patch)).rejects.toMatchObject({ name: 'ServiceError', code: 'invalid' });
    }
    expect(fake.queries).toHaveLength(0);
    expect(fake.getSessionCalls()).toBe(0);
  });

  it('boş istek yazmaz, mevcut profili okur', async () => {
    const fake = setupFakeSupabase(from, getSession, { tables: { users_profile: { data: row } } });
    await expect(service.updateProfile({})).resolves.toMatchObject({ name: 'Ayşe Yılmaz' });
    expect(fake.args(fake.on('users_profile')[0], 'update')).toBeUndefined();
  });

  it('oturum yoksa unauthenticated', async () => {
    const fake = setupFakeSupabase(from, getSession, { userId: null });
    await expect(service.updateProfile({ name: 'Mert Kaya' })).rejects.toMatchObject({ code: 'unauthenticated' });
    expect(fake.queries).toHaveLength(0);
  });

  it('hata ServiceError olur ve iç mesaj sızmaz', async () => {
    setupFakeSupabase(from, getSession, { tables: { users_profile: { error: { code: '', message: 'secret' } } } });
    const error = await service.updateProfile({ name: 'Mert Kaya' }).catch((e) => e);
    expect(error).toMatchObject({ name: 'ServiceError', code: 'network' });
    expect(error.message).not.toContain('secret');
  });

  it('RLS/kısıt reddi (42501) invalid olur', async () => {
    setupFakeSupabase(from, getSession, { tables: { users_profile: { error: { code: '42501', message: 'rls' } } } });
    await expect(service.updateProfile({ name: 'Mert Kaya' })).rejects.toMatchObject({ code: 'invalid' });
  });

  it('hiçbir satır güncellenmediyse not_found', async () => {
    setupFakeSupabase(from, getSession, { tables: { users_profile: { data: null } } });
    await expect(service.updateProfile({ name: 'Mert Kaya' })).rejects.toMatchObject({ code: 'not_found' });
  });
});

import { MOCK_BADGES } from '../mock/mockBadges';
import { BADGE_ORDER } from '../badgeOrder';
import { supabase } from './supabaseClient';
import { createSupabaseBadgeService } from './supabaseBadgeService';
import { setupFakeSupabase } from './supabaseTestUtils';

jest.mock('./supabaseClient', () => ({
  supabase: { auth: { getSession: jest.fn() }, from: jest.fn() },
}));

const getSession = supabase.auth.getSession as jest.Mock;
const from = supabase.from as jest.Mock;
const service = createSupabaseBadgeService();

const catalog = [
  { id: 'first-5k', name: 'İlk 5 km', description: 'Tek seferde 5 km tamamla.' },
  { id: 'streak-7', name: 'Yedi gün üst üste', description: null },
];

describe('supabaseBadgeService', () => {
  it('kataloğu kullanıcının kazandıklarıyla birleştirir', async () => {
    const fake = setupFakeSupabase(from, getSession, {
      tables: {
        badges: { data: catalog },
        user_badges: { data: [{ badge_id: 'first-5k', earned_at: '2026-08-23T06:04:00Z' }] },
      },
    });
    await expect(service.getBadges()).resolves.toEqual([
      { id: 'first-5k', name: 'İlk 5 km', description: 'Tek seferde 5 km tamamla.', earned: true, earnedAt: '2026-08-23T06:04:00Z' },
      { id: 'streak-7', name: 'Yedi gün üst üste', description: '', earned: false },
    ]);
    expect(fake.args(fake.on('user_badges')[0], 'eq')).toEqual(['user_id', 'user-1']);
  });

  it('rozetleri bilinen sıraya dizer, bilinmeyenleri katalog sırasıyla sona koyar', async () => {
    setupFakeSupabase(from, getSession, {
      tables: {
        badges: {
          data: [
            { id: 'zzz-new', name: 'Yeni A', description: '' },
            { id: 'streak-7', name: 'S', description: 'd' },
            { id: 'aaa-new', name: 'Yeni B', description: '' },
            { id: 'first-5k', name: 'F', description: 'd' },
          ],
        },
        user_badges: { data: [] },
      },
    });
    const badges = await service.getBadges();
    expect(badges.map((b) => b.id)).toEqual(['first-5k', 'streak-7', 'zzz-new', 'aaa-new']);
  });

  it('BADGE_ORDER mock rozet sırasıyla aynıdır', () => {
    expect([...BADGE_ORDER]).toEqual(MOCK_BADGES.map((b) => b.id));
  });

  it('boş katalog mock’a düşmez, boş liste döner', async () => {
    setupFakeSupabase(from, getSession, { tables: { badges: { data: [] }, user_badges: { data: [] } } });
    await expect(service.getBadges()).resolves.toEqual([]);
  });

  it('oturum yoksa unauthenticated', async () => {
    setupFakeSupabase(from, getSession, { userId: null });
    await expect(service.getBadges()).rejects.toMatchObject({ code: 'unauthenticated' });
    expect(from).not.toHaveBeenCalled();
  });

  it.each(['badges', 'user_badges'])('%s hatası ServiceError(network) olur', async (table) => {
    setupFakeSupabase(from, getSession, {
      tables: { badges: { data: catalog }, user_badges: { data: [] }, [table]: { error: { code: '', message: 'secret' } } },
    });
    const error = await service.getBadges().catch((e) => e);
    expect(error).toMatchObject({ name: 'ServiceError', code: 'network' });
    expect(error.message).not.toContain('secret');
  });
});

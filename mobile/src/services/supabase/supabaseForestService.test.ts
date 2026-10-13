import { supabase } from './supabaseClient';
import { createSupabaseForestService } from './supabaseForestService';
import { setupFakeSupabase } from './supabaseTestUtils';

jest.mock('./supabaseClient', () => ({
  supabase: { auth: { getSession: jest.fn() }, from: jest.fn() },
}));

const getSession = supabase.auth.getSession as jest.Mock;
const from = supabase.from as jest.Mock;
const service = createSupabaseForestService();

describe('supabaseForestService', () => {
  it('ağaç türü adını birleştirip temsili ağaç döner', async () => {
    const fake = setupFakeSupabase(from, getSession, {
      tables: {
        user_trees: {
          data: [
            { id: 'a1b2c3d4-0000-0000-0000-000000000001', planted_at: '2026-10-01T00:00:00Z', tree_type_id: 'oak', tree_types: { name: 'Meşe Ağacı' } },
            { id: 'ffffffff-0000-0000-0000-000000000002', planted_at: '2026-09-01T00:00:00Z', tree_type_id: 'pine', tree_types: [{ name: 'Çam Ağacı' }] },
            { id: 'eeeeeeee-0000-0000-0000-000000000003', planted_at: '2026-08-01T00:00:00Z', tree_type_id: 'sakura', tree_types: null },
          ],
        },
      },
    });
    const trees = await service.getTrees();
    expect(trees.map((t) => t.species)).toEqual(['Meşe Ağacı', 'Çam Ağacı', 'sakura']);
    expect(trees[0]).toMatchObject({ plantedAt: '2026-10-01T00:00:00Z', certificateNo: 'ORNEK-A1B2C3D4', isSample: true });
    expect(trees[0].sponsor).toBeUndefined();
    const query = fake.on('user_trees')[0];
    expect(fake.args(query, 'eq')).toEqual(['user_id', 'user-1']);
    expect(fake.args(query, 'order')).toEqual(['planted_at', { ascending: false }]);
  });

  it('ağaç yoksa boş liste döner (mock yok)', async () => {
    setupFakeSupabase(from, getSession, { tables: { user_trees: { data: [] } } });
    await expect(service.getTrees()).resolves.toEqual([]);
  });

  it('oturum yoksa unauthenticated', async () => {
    setupFakeSupabase(from, getSession, { userId: null });
    await expect(service.getTrees()).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('Postgrest hatası ServiceError olur', async () => {
    setupFakeSupabase(from, getSession, { tables: { user_trees: { error: { code: 'XX000', message: 'secret' } } } });
    const error = await service.getTrees().catch((e) => e);
    expect(error).toMatchObject({ name: 'ServiceError', code: 'network' });
    expect(error.message).not.toContain('secret');
  });
});

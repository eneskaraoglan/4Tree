import { supabase } from './supabaseClient';
import { createSupabaseFeedService } from './supabaseFeedService';
import { setupFakeSupabase } from './supabaseTestUtils';

jest.mock('./supabaseClient', () => ({
  supabase: { auth: { getSession: jest.fn() }, from: jest.fn() },
}));

const getSession = supabase.auth.getSession as jest.Mock;
const from = supabase.from as jest.Mock;
const service = createSupabaseFeedService();

const view = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  user_id: 'u2',
  author_name: 'Mert Kaya',
  author_avatar_initial: 'M',
  author_visibility: 'public',
  caption: 'Güzel bir sabah',
  activity_type: 'run',
  distance_m: 5200,
  duration_secs: 1560,
  place: 'Belgrad Ormanı',
  trees_earned: 0,
  clap_count: 3,
  water_count: 1,
  comment_count: 2,
  created_at: '2026-10-09T06:40:00Z',
  is_friend: true,
  ...over,
});

describe('getPosts', () => {
  it('view sütunlarını FeedPost alanlarına eşler; route yok', async () => {
    setupFakeSupabase(from, getSession, {
      tables: { feed_posts_view: { data: [view()] }, post_reactions: { data: [] } },
    });
    const [post] = await service.getPosts();
    expect(post).toEqual({
      id: 'p1',
      author: { id: 'u2', name: 'Mert Kaya', avatarInitial: 'M' },
      isFriend: true,
      caption: 'Güzel bir sabah',
      activity: { type: 'run', distanceKm: 5.2, durationSec: 1560, paceSecPerKm: 300, place: 'Belgrad Ormanı' },
      treesEarned: 0,
      reactionCounts: { water: 1, clap: 3 },
      myReaction: null,
      commentCount: 2,
      createdAt: '2026-10-09T06:40:00Z',
    });
    expect(post.activity.route).toBeUndefined();
  });

  it('isFriend view’dan gelir (kendi gönderisi olması çıkarım değildir)', async () => {
    setupFakeSupabase(from, getSession, {
      tables: {
        feed_posts_view: { data: [view({ id: 'a', user_id: 'user-1', is_friend: false }), view({ id: 'b', is_friend: true })] },
        post_reactions: { data: [] },
      },
    });
    const posts = await service.getPosts();
    expect(posts.map((p) => p.isFriend)).toEqual([false, true]);
  });

  it('mesafe 0 ise tempo 0; boş ad ve baş harf yedeği', async () => {
    setupFakeSupabase(from, getSession, {
      tables: {
        feed_posts_view: {
          data: [view({ distance_m: 0, caption: null, author_name: 'ada', author_avatar_initial: '', activity_type: 'walk' })],
        },
        post_reactions: { data: [] },
      },
    });
    const [post] = await service.getPosts();
    expect(post.activity).toMatchObject({ paceSecPerKm: 0, type: 'walk' });
    expect(post.author).toMatchObject({ name: 'ada', avatarInitial: 'A' });
    expect(post).not.toHaveProperty('caption');
  });

  it('myReaction: giriş yapan kullanıcının tepkileri tek sorguda okunur', async () => {
    const fake = setupFakeSupabase(from, getSession, {
      tables: {
        feed_posts_view: { data: [view({ id: 'p1' }), view({ id: 'p2' }), view({ id: 'p3' })] },
        post_reactions: {
          data: [
            { post_id: 'p1', reaction: 'clap' },
            { post_id: 'p2', reaction: 'clap' },
            { post_id: 'p2', reaction: 'water' },
          ],
        },
      },
    });
    const posts = await service.getPosts();
    // p2'de iki eski satır var (created_at yok): sonuncusu (water) geçerli.
    expect(posts.map((p) => p.myReaction)).toEqual(['clap', 'water', null]);
    const reactionQueries = fake.on('post_reactions');
    expect(reactionQueries).toHaveLength(1);
    expect(fake.args(reactionQueries[0], 'eq')).toEqual(['user_id', 'user-1']);
    expect(fake.args(reactionQueries[0], 'in')).toEqual(['post_id', ['p1', 'p2', 'p3']]);
  });

  it('en yeni önce sıralar ve en çok 100 gönderi ister', async () => {
    const fake = setupFakeSupabase(from, getSession, {
      tables: { feed_posts_view: { data: [view()] }, post_reactions: { data: [] } },
    });
    await service.getPosts();
    const query = fake.on('feed_posts_view')[0];
    expect(fake.args(query, 'order')).toEqual(['created_at', { ascending: false }]);
    expect(fake.args(query, 'limit')).toEqual([100]);
    expect(fake.args(query, 'select')?.[0]).toContain('distance_m');
    expect(fake.args(query, 'select')?.[0]).not.toContain('author_visibility');
  });

  it("scope='friends' is_friend=true süzer, 'everyone' süzmez", async () => {
    const tables = { feed_posts_view: { data: [view()] }, post_reactions: { data: [] } };
    const fake = setupFakeSupabase(from, getSession, { tables });
    await service.getPosts('friends');
    expect(fake.args(fake.on('feed_posts_view')[0], 'eq')).toEqual(['is_friend', true]);
    const all = setupFakeSupabase(from, getSession, { tables });
    await service.getPosts();
    expect(all.args(all.on('feed_posts_view')[0], 'eq')).toBeUndefined();
  });

  it('gönderi yoksa tepki sorgusu yapılmaz, boş liste döner', async () => {
    const fake = setupFakeSupabase(from, getSession, { tables: { feed_posts_view: { data: [] } } });
    await expect(service.getPosts()).resolves.toEqual([]);
    expect(fake.on('post_reactions')).toHaveLength(0);
  });

  it('oturum yoksa unauthenticated', async () => {
    setupFakeSupabase(from, getSession, { userId: null });
    await expect(service.getPosts()).rejects.toMatchObject({ code: 'unauthenticated' });
    expect(from).not.toHaveBeenCalled();
  });

  it.each(['feed_posts_view', 'post_reactions'])('%s hatası network, mock’a düşmez', async (table) => {
    setupFakeSupabase(from, getSession, {
      tables: { feed_posts_view: { data: [view()] }, post_reactions: { data: [] }, [table]: { error: { code: '', message: 'secret' } } },
    });
    const error = await service.getPosts().catch((e) => e);
    expect(error).toMatchObject({ name: 'ServiceError', code: 'network' });
    expect(error.message).not.toContain('secret');
  });
});

it('supportedReactions yalnız enum’un taşıdığı water ve clap', () => {
  expect(service.supportedReactions).toEqual(['water', 'clap']);
});

it('sayısı 0 olan tür reactionCounts içinde yer almaz; boş görünümde {}', async () => {
  setupFakeSupabase(from, getSession, {
    tables: { feed_posts_view: { data: [view({ clap_count: 0, water_count: '4' })] }, post_reactions: { data: [] } },
  });
  const [post] = await service.getPosts();
  expect(post.reactionCounts).toEqual({ water: 4 });
  setupFakeSupabase(from, getSession, {
    tables: { feed_posts_view: { data: [view({ clap_count: null, water_count: 0 })] }, post_reactions: { data: [] } },
  });
  expect((await service.getPosts())[0].reactionCounts).toEqual({});
});

it('birden fazla satır varsa en yeni created_at geçerli; bilinmeyen tür yok sayılır', async () => {
  setupFakeSupabase(from, getSession, {
    tables: {
      feed_posts_view: { data: [view({ id: 'p1' }), view({ id: 'p2' })] },
      post_reactions: {
        data: [
          { post_id: 'p1', reaction: 'clap', created_at: '2026-10-10T10:00:00Z' },
          { post_id: 'p1', reaction: 'water', created_at: '2026-10-10T11:00:00Z' },
          { post_id: 'p1', reaction: 'clap', created_at: '2026-10-10T09:00:00Z' },
          { post_id: 'p2', reaction: 'rocket', created_at: '2026-10-10T11:00:00Z' },
        ],
      },
    },
  });
  const posts = await service.getPosts();
  expect(posts.map((p) => p.myReaction)).toEqual(['water', null]);
});

describe('setReaction', () => {
  const after = (over: Record<string, unknown>, reactions: unknown[]) => ({
    feed_posts_view: { data: view(over) },
    // Sırayla: silme, (varsa) ekleme, kullanıcının tepkilerini okuma.
    post_reactions: [{ data: null }, { data: null }, { data: reactions }],
  });

  it('seçilen tepki: önce kullanıcının mevcut tepkilerini siler, sonra ekler, sunucudan yeniden okur', async () => {
    const fake = setupFakeSupabase(from, getSession, {
      tables: after({ clap_count: 7, water_count: 0 }, [{ post_id: 'p1', reaction: 'clap' }]),
    });
    const post = await service.setReaction('p1', 'clap');
    expect(post.reactionCounts).toEqual({ clap: 7 });
    expect(post.myReaction).toBe('clap');

    const [remove, add, read] = fake.on('post_reactions');
    expect(fake.args(remove, 'delete')).toBeDefined();
    // Silme tür süzmez: kullanıcının bu gönderideki tüm tepkileri gider.
    expect(fake.all(remove, 'eq')).toEqual([['post_id', 'p1'], ['user_id', 'user-1']]);
    expect(fake.args(add, 'upsert')).toEqual([
      { post_id: 'p1', user_id: 'user-1', reaction: 'clap' },
      { onConflict: 'post_id,user_id,reaction', ignoreDuplicates: true },
    ]);
    expect(fake.args(read, 'in')).toEqual(['post_id', ['p1']]);
    expect(fake.args(fake.on('feed_posts_view')[0], 'eq')).toEqual(['id', 'p1']);
    expect(fake.getSessionCalls()).toBe(1);
  });

  it('tür değiştirme: water yazar, eski clap satırı silinmiş olarak okunur', async () => {
    const fake = setupFakeSupabase(from, getSession, {
      tables: after({ water_count: 2, clap_count: 1 }, [{ post_id: 'p1', reaction: 'water' }]),
    });
    const post = await service.setReaction('p1', 'water');
    expect(post).toMatchObject({ reactionCounts: { water: 2, clap: 1 }, myReaction: 'water' });
    expect(fake.args(fake.on('post_reactions')[1], 'upsert')?.[0]).toMatchObject({ reaction: 'water' });
  });

  it('null: yalnız siler (ekleme yok) ve tepkisiz gönderiyi döner', async () => {
    const fake = setupFakeSupabase(from, getSession, {
      tables: { feed_posts_view: { data: view({ clap_count: 2 }) }, post_reactions: [{ data: null }, { data: [] }] },
    });
    const post = await service.setReaction('p1', null);
    expect(post).toMatchObject({ reactionCounts: { water: 1, clap: 2 }, myReaction: null });
    const queries = fake.on('post_reactions');
    expect(queries).toHaveLength(2);
    expect(fake.args(queries[0], 'delete')).toBeDefined();
    expect(fake.args(queries[0], 'upsert')).toBeUndefined();
    expect(fake.args(queries[1], 'upsert')).toBeUndefined();
  });

  it.each(['leaf', 'heart', 'power', 'rocket'])('desteklenmeyen %s: invalid, hiçbir sorgu yapılmaz', async (reaction) => {
    setupFakeSupabase(from, getSession);
    await expect(service.setReaction('p1', reaction as never)).rejects.toMatchObject({
      name: 'ServiceError',
      code: 'invalid',
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('idempotent: aynı tepkiyi tekrar göndermek sayıyı sunucudaki değerde bırakır', async () => {
    setupFakeSupabase(from, getSession, {
      tables: {
        feed_posts_view: { data: view({ clap_count: 4 }) },
        post_reactions: [
          { data: null },
          { data: null },
          { data: [{ post_id: 'p1', reaction: 'clap' }] },
          { data: null },
          { data: null },
          { data: [{ post_id: 'p1', reaction: 'clap' }] },
        ],
      },
    });
    const first = await service.setReaction('p1', 'clap');
    const second = await service.setReaction('p1', 'clap');
    expect(second.reactionCounts.clap).toBe(first.reactionCounts.clap);
    expect(second.reactionCounts.clap).toBe(4);
  });

  it('gönderi yoksa not_found (view boş, yabancı anahtar, bozuk kimlik)', async () => {
    setupFakeSupabase(from, getSession, { tables: { feed_posts_view: { data: null }, post_reactions: [{ data: null }, { data: [] }] } });
    await expect(service.setReaction('nope', null)).rejects.toMatchObject({ code: 'not_found' });
    setupFakeSupabase(from, getSession, { tables: { post_reactions: [{ data: null }, { error: { code: '23503' } }] } });
    await expect(service.setReaction('nope', 'water')).rejects.toMatchObject({ code: 'not_found' });
    setupFakeSupabase(from, getSession, { tables: { post_reactions: { error: { code: '22P02' } } } });
    await expect(service.setReaction('bad', 'water')).rejects.toMatchObject({ code: 'not_found' });
  });

  it('oturum yokken sessizce geçmez: unauthenticated, yazma yok', async () => {
    setupFakeSupabase(from, getSession, { userId: null });
    await expect(service.setReaction('p1', 'clap')).rejects.toMatchObject({ code: 'unauthenticated' });
    await expect(service.setReaction('p1', null)).rejects.toMatchObject({ code: 'unauthenticated' });
    expect(from).not.toHaveBeenCalled();
  });

  it('silme hatası ServiceError olur; ekleme ve okuma yapılmaz, mesaj sızmaz', async () => {
    const fake = setupFakeSupabase(from, getSession, {
      tables: { post_reactions: { error: { code: '', message: 'secret' } }, feed_posts_view: { data: view() } },
    });
    const error = await service.setReaction('p1', 'clap').catch((e) => e);
    expect(error).toMatchObject({ name: 'ServiceError', code: 'network' });
    expect(error.message).not.toContain('secret');
    expect(fake.on('post_reactions')).toHaveLength(1);
    expect(fake.on('feed_posts_view')).toHaveLength(0);
  });

  it('ekleme hatası (RLS) invalid olur; okuma yapılmaz', async () => {
    const fake = setupFakeSupabase(from, getSession, {
      tables: { post_reactions: [{ data: null }, { error: { code: '42501' } }], feed_posts_view: { data: view() } },
    });
    await expect(service.setReaction('p1', 'clap')).rejects.toMatchObject({ code: 'invalid' });
    expect(fake.on('feed_posts_view')).toHaveLength(0);
  });
});

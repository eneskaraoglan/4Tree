import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  createMockServices,
  ServiceError,
  ServicesProvider,
  type FeedScope,
  type FeedService,
  type Services,
} from '@/services';
import type { FeedPost, ReactionType } from '@/types';

import { NOTICE_MS, swapMine, useFeed } from './useFeed';

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void };
function defer<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => act(async () => {});

function setup(overrides: Partial<FeedService> = {}, initialScope: FeedScope = 'friends') {
  const base = createMockServices();
  const services: Services = { ...base, feed: { ...base.feed, ...overrides } };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ServicesProvider services={services}>{children}</ServicesProvider>
  );
  return { base, wrapper, initialScope };
}

async function renderFeedHook(overrides: Partial<FeedService> = {}, initialScope: FeedScope = 'friends') {
  const { base, wrapper } = setup(overrides, initialScope);
  const hook = await renderHook(({ scope }: { scope: FeedScope }) => useFeed(scope), {
    initialProps: { scope: initialScope },
    wrapper,
  });
  return { ...hook, base };
}

const post = (result: { current: ReturnType<typeof useFeed> }, id: string) =>
  result.current.posts.find((p) => p.id === id)!;

describe('useFeed', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('Arkadaşlar yalnız arkadaşları, Herkes hepsini yükler; sekme başına önbellek tutar', async () => {
    const calls: (FeedScope | undefined)[] = [];
    const base = createMockServices();
    const { result, rerender } = await renderFeedHook({
      getPosts: (scope) => {
        calls.push(scope);
        return base.feed.getPosts(scope);
      },
    });
    await flush();
    const friendNames = result.current.posts.map((p) => p.author.name);
    expect(result.current.status).toBe('ready');
    expect(friendNames).toContain('Mert');
    for (const stranger of ['Selin', 'Barış', 'Ece']) expect(friendNames).not.toContain(stranger);
    expect(result.current.posts.every((p) => p.isFriend)).toBe(true);

    await rerender({ scope: 'everyone' });
    await flush();
    const names = result.current.posts.map((p) => p.author.name);
    for (const stranger of ['Selin', 'Barış', 'Ece']) expect(names).toContain(stranger);

    await rerender({ scope: 'friends' });
    expect(result.current.posts.map((p) => p.author.name)).toEqual(friendNames);
    expect(calls).toEqual(['friends', 'everyone']);
  });

  it('tepkiyi iyimser günceller ve her iki sekmedeki aynı gönderiye uygular', async () => {
    const { result, rerender } = await renderFeedHook();
    await flush();
    await rerender({ scope: 'everyone' });
    await flush();

    await act(async () => result.current.react('post-002', 'clap'));
    expect(post(result, 'post-002').reactionCounts.clap).toBe(25);
    expect(post(result, 'post-002').myReaction).toBe('clap');
    await flush();

    await rerender({ scope: 'friends' });
    expect(post(result, 'post-002').reactionCounts.clap).toBe(25);
    expect(post(result, 'post-002').myReaction).toBe('clap');
  });

  it('tepkiyi değiştirince eski türün sayısı -1, yenisi +1; null geri alır', async () => {
    const { result } = await renderFeedHook();
    await flush();
    await act(async () => result.current.react('post-002', 'clap'));
    await flush();
    await act(async () => result.current.react('post-002', 'heart'));
    // Sunucu yanıtı gelmeden: alkış geri 24, kalp 3.
    expect(post(result, 'post-002').myReaction).toBe('heart');
    expect(post(result, 'post-002').reactionCounts).toMatchObject({ clap: 24, heart: 3, water: 9 });
    await flush();
    expect(post(result, 'post-002').reactionCounts).toMatchObject({ clap: 24, heart: 3 });

    await act(async () => result.current.react('post-002', null));
    expect(post(result, 'post-002').myReaction).toBeNull();
    expect(post(result, 'post-002').reactionCounts.heart).toBe(2);
    await flush();
    expect(post(result, 'post-002').reactionCounts).toEqual({ clap: 24, water: 9, leaf: 3, heart: 2 });
  });

  it('supportedReactions servisten gelir', async () => {
    const { result } = await renderFeedHook({ supportedReactions: ['water', 'clap'] });
    expect(result.current.supportedReactions).toEqual(['water', 'clap']);
  });

  it('hızlı değişimde istekler sıralıdır; yalnız son istenen gönderilir', async () => {
    const base = createMockServices();
    const first = defer<void>();
    const calls: (string | null)[] = [];
    const setReaction = jest.fn(async (id: string, reaction: ReactionType | null) => {
      calls.push(reaction);
      if (calls.length === 1) await first.promise;
      return base.feed.setReaction(id, reaction);
    });
    const { result } = await renderFeedHook({ setReaction });
    await flush();

    await act(async () => result.current.react('post-002', 'clap'));
    await act(async () => result.current.react('post-002', 'heart'));
    await act(async () => result.current.react('post-002', 'leaf'));
    // İlk istek bitmeden ikincisi gönderilmez; ekran son seçimi gösterir.
    expect(calls).toEqual(['clap']);
    expect(post(result, 'post-002').myReaction).toBe('leaf');
    expect(post(result, 'post-002').reactionCounts).toMatchObject({ clap: 24, heart: 2, leaf: 4 });

    await act(async () => first.resolve());
    // Ara değer (heart) atlanır: tek turda son istenen (leaf) gönderilir.
    expect(calls).toEqual(['clap', 'leaf']);
    expect(post(result, 'post-002').myReaction).toBe('leaf');
    expect(post(result, 'post-002').reactionCounts).toEqual({ clap: 24, water: 9, leaf: 4, heart: 2 });
  });

  it('ikinci istek düşerse son onaylı tepkiye (ve sayılarına) döner', async () => {
    const base = createMockServices();
    const first = defer<void>();
    let n = 0;
    const setReaction = jest.fn(async (id: string, reaction: ReactionType | null) => {
      n += 1;
      if (n === 1) {
        await first.promise;
        return base.feed.setReaction(id, reaction);
      }
      throw new ServiceError('network', 'x');
    });
    const { result } = await renderFeedHook({ setReaction });
    await flush();
    await act(async () => result.current.react('post-002', 'clap'));
    await act(async () => result.current.react('post-002', 'heart'));
    await act(async () => first.resolve());
    await flush();
    expect(post(result, 'post-002').myReaction).toBe('clap');
    expect(post(result, 'post-002').reactionCounts).toMatchObject({ clap: 25, heart: 2 });
    expect(result.current.notice?.key).toBe('post-002:reaction');
  });

  it('aynı tepkiyi tekrar belirlemek istek göndermez', async () => {
    const setReaction = jest.fn();
    const { result } = await renderFeedHook({ setReaction });
    await flush();
    // Mert (post-001) zaten alkışlamış.
    await act(async () => result.current.react('post-001', 'clap'));
    await flush();
    expect(setReaction).not.toHaveBeenCalled();
    expect(post(result, 'post-001').reactionCounts.clap).toBe(18);
  });

  it('hata olursa geri alır, bildirimi `${postId}:reaction` anahtarıyla verir ve 6 sn sonra kaldırır', async () => {
    const { result } = await renderFeedHook({
      setReaction: jest.fn().mockRejectedValue(new ServiceError('network', 'x')),
    });
    await flush();

    await act(async () => result.current.react('post-002', 'clap'));
    await flush();
    expect(post(result, 'post-002').reactionCounts.clap).toBe(24);
    expect(post(result, 'post-002').myReaction).toBeNull();
    expect(result.current.notice).toEqual({ key: 'post-002:reaction', text: 'Tepki gönderilemedi. Tekrar dene.' });

    expect(NOTICE_MS).toBe(6000);
    await act(async () => {
      jest.advanceTimersByTime(NOTICE_MS - 1);
    });
    expect(result.current.notice).not.toBeNull();
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current.notice).toBeNull();
  });

  it('başka gönderinin dokunuşu mesajı silmez; aynı gönderinin yeni dokunuşu siler', async () => {
    const pending = defer<FeedPost>();
    const { result } = await renderFeedHook({
      setReaction: jest
        .fn()
        .mockRejectedValueOnce(new ServiceError('network', 'x'))
        .mockImplementation(() => pending.promise),
    });
    await flush();
    await act(async () => result.current.react('post-002', 'clap'));
    await flush();
    expect(result.current.notice?.key).toBe('post-002:reaction');

    await act(async () => result.current.react('post-001', 'water'));
    expect(result.current.notice?.key).toBe('post-002:reaction');

    await act(async () => result.current.react('post-002', 'clap'));
    expect(result.current.notice).toBeNull();
  });

  it('tepki uçuştayken yenileme iyimser durumu ezmez ve istek sahipsiz kalmaz', async () => {
    const pending = defer<void>();
    const base = createMockServices();
    const setReaction = jest.fn(async (id: string, reaction: ReactionType | null) => {
      await pending.promise;
      return base.feed.setReaction(id, reaction);
    });
    const { result } = await renderFeedHook({ setReaction }, 'friends');
    await flush();

    await act(async () => result.current.react('post-002', 'clap'));
    await act(async () => {
      await result.current.refresh();
    });
    // Sunucu henüz eski değeri döndü; kullanıcının tepkisi ve sayısı korunur.
    expect(post(result, 'post-002').myReaction).toBe('clap');
    expect(post(result, 'post-002').reactionCounts.clap).toBe(25);

    // Yenileme sırasında ikinci dokunuş da aynı döngüye girer: son istenen değer gönderilir.
    await act(async () => result.current.react('post-002', null));
    expect(post(result, 'post-002').reactionCounts.clap).toBe(24);
    await act(async () => pending.resolve());
    expect(setReaction.mock.calls.map((c) => c[1])).toEqual(['clap', null]);
    expect(post(result, 'post-002').reactionCounts.clap).toBe(24);
    expect(post(result, 'post-002').myReaction).toBeNull();
  });

  it('yenileme sürerken onaylanan tepki, gecikmeli (eski) yenileme yanıtıyla ezilmez', async () => {
    const base = createMockServices();
    const stale = await base.feed.getPosts('friends');
    const late = defer<FeedPost[]>();
    const getPosts = jest
      .fn<Promise<FeedPost[]>, [FeedScope?]>()
      .mockImplementationOnce((s) => base.feed.getPosts(s))
      .mockImplementationOnce(() => late.promise);
    const { result } = await renderFeedHook({ getPosts });
    await flush();

    let refreshing!: Promise<void>;
    await act(async () => {
      refreshing = result.current.refresh();
    });
    // Yenileme sürerken tepki verilir ve sunucu onaylar (tepki artık uçuşta değil).
    await act(async () => result.current.react('post-002', 'clap'));
    await flush();
    expect(post(result, 'post-002').reactionCounts.clap).toBe(25);

    // Yanıt tepkiden önceki sunucu durumunu taşıyor (24, alkışsız).
    await act(async () => {
      late.resolve(stale);
      await refreshing;
    });
    expect(post(result, 'post-002').myReaction).toBe('clap');
    expect(post(result, 'post-002').reactionCounts.clap).toBe(25);
  });

  it('yenileme başlamadan önce onaylanan tepki yeni yanıtla (sunucu gerçeğiyle) güncellenir', async () => {
    const { result } = await renderFeedHook();
    await flush();
    await act(async () => result.current.react('post-002', 'clap'));
    await flush();
    await act(async () => {
      await result.current.refresh();
    });
    expect(post(result, 'post-002').reactionCounts.clap).toBe(25);
    expect(post(result, 'post-002').myReaction).toBe('clap');
  });

  it('yenileme sürerken gelen ikinci çekme yok sayılır', async () => {
    const second = defer<FeedPost[]>();
    const base = createMockServices();
    const getPosts = jest
      .fn<Promise<FeedPost[]>, [FeedScope?]>()
      .mockImplementationOnce((s) => base.feed.getPosts(s))
      .mockImplementationOnce(() => second.promise);
    const { result } = await renderFeedHook({ getPosts });
    await flush();

    let first!: Promise<void>;
    await act(async () => {
      first = result.current.refresh();
    });
    expect(result.current.refreshing).toBe(true);
    await act(async () => {
      await result.current.refresh();
    });
    expect(getPosts).toHaveBeenCalledTimes(2);

    await act(async () => {
      second.resolve(await base.feed.getPosts('friends'));
      await first;
    });
    expect(result.current.refreshing).toBe(false);
  });

  it('eski yanıt yenisini ezmez (üst üste yenileme ve tekrar dene)', async () => {
    const base = createMockServices();
    const all = await base.feed.getPosts('friends');
    const slow = defer<FeedPost[]>();
    const fast = defer<FeedPost[]>();
    const getPosts = jest
      .fn<Promise<FeedPost[]>, [FeedScope?]>()
      .mockResolvedValueOnce(all)
      .mockImplementationOnce(() => slow.promise)
      .mockImplementationOnce(() => fast.promise);
    const { result } = await renderFeedHook({ getPosts });
    await flush();

    let refreshing!: Promise<void>;
    await act(async () => {
      refreshing = result.current.refresh();
    });
    await act(async () => result.current.retry());

    await act(async () => fast.resolve([all[0]]));
    expect(result.current.posts.map((p) => p.id)).toEqual([all[0].id]);

    await act(async () => {
      slow.resolve(all);
      await refreshing;
    });
    expect(result.current.posts.map((p) => p.id)).toEqual([all[0].id]);
    expect(result.current.refreshing).toBe(false);
  });

  it('hızlı sekme değişiminde yanıtlar kendi sekmesine yazılır', async () => {
    const base = createMockServices();
    const friends = defer<FeedPost[]>();
    const everyone = defer<FeedPost[]>();
    const getPosts = jest.fn((scope?: FeedScope) => (scope === 'everyone' ? everyone.promise : friends.promise));
    const { result, rerender } = await renderFeedHook({ getPosts });
    await rerender({ scope: 'everyone' });
    await rerender({ scope: 'friends' });
    await rerender({ scope: 'everyone' });
    await rerender({ scope: 'friends' });
    expect(getPosts).toHaveBeenCalledTimes(2);

    await act(async () => everyone.resolve(await base.feed.getPosts('everyone')));
    expect(result.current.status).toBe('loading');
    await act(async () => friends.resolve(await base.feed.getPosts('friends')));
    expect(result.current.status).toBe('ready');
    expect(result.current.posts.some((p) => p.author.name === 'Selin')).toBe(false);
    await rerender({ scope: 'everyone' });
    expect(result.current.posts.some((p) => p.author.name === 'Selin')).toBe(true);
  });

  it('bir sekmenin hatası öteki sekmeyi bozmaz; tekrar dene o sekmeyi yeniden yükler', async () => {
    const base = createMockServices();
    let everyoneCalls = 0;
    const getPosts = jest.fn((scope?: FeedScope) => {
      if (scope === 'everyone') everyoneCalls += 1;
      return scope === 'everyone' && everyoneCalls === 1
        ? Promise.reject(new ServiceError('network', 'x'))
        : base.feed.getPosts(scope);
    });
    const { result, rerender } = await renderFeedHook({ getPosts });
    await flush();
    await rerender({ scope: 'everyone' });
    await flush();
    expect(result.current.status).toBe('error');

    await rerender({ scope: 'friends' });
    expect(result.current.status).toBe('ready');

    await rerender({ scope: 'everyone' });
    await act(async () => result.current.retry());
    await flush();
    expect(result.current.status).toBe('ready');
  });

  it('kaldırıldıktan sonra gelen hata durum güncellemez, bildirim zamanlayıcısı kurmaz', async () => {
    const pending = defer<FeedPost>();
    const { result, unmount } = await renderFeedHook({ setReaction: jest.fn(() => pending.promise) });
    await flush();
    await act(async () => result.current.react('post-002', 'clap'));
    const before = result.current;

    await unmount();
    const setTimeoutSpy = jest.spyOn(globalThis, 'setTimeout');
    await act(async () => pending.reject(new ServiceError('network', 'x')));
    expect(result.current).toBe(before);
    expect(setTimeoutSpy.mock.calls.filter((c) => c[1] === NOTICE_MS)).toHaveLength(0);
    setTimeoutSpy.mockRestore();
  });

  it('kaldırılınca bekleyen bildirim zamanlayıcısını temizler', async () => {
    const setTimeoutSpy = jest.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');
    const { result, unmount } = await renderFeedHook({
      setReaction: jest.fn().mockRejectedValue(new ServiceError('network', 'x')),
    });
    await flush();
    await act(async () => result.current.react('post-002', 'water'));
    await flush();
    expect(result.current.notice).not.toBeNull();
    const idx = setTimeoutSpy.mock.calls.findIndex((c) => c[1] === NOTICE_MS);
    const handle = setTimeoutSpy.mock.results[idx].value;
    await unmount();
    expect(clearTimeoutSpy).toHaveBeenCalledWith(handle);
    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });

  describe('sayfalama (pagination / infinite scroll)', () => {
    it('sayfa boyutuna göre hasMore belirler ve loadMore sonraki sayfayı ekler', async () => {
      const { wrapper } = setup({}, 'everyone');
      const hook = await renderHook(({ scope }: { scope: FeedScope }) => useFeed(scope, 2), {
        initialProps: { scope: 'everyone' as FeedScope },
        wrapper,
      });
      await flush();

      expect(hook.result.current.posts).toHaveLength(2);
      expect(hook.result.current.hasMore).toBe(true);

      await act(async () => {
        hook.result.current.loadMore();
      });
      await flush();

      expect(hook.result.current.posts).toHaveLength(4);
      expect(hook.result.current.hasMore).toBe(true);

      await act(async () => {
        hook.result.current.loadMore();
      });
      await flush();

      expect(hook.result.current.posts).toHaveLength(6);
      expect(hook.result.current.hasMore).toBe(true);
    });

    it('yenileme (refresh) yapıldığında ilk sayfaya döner ve hasMore tazelenir', async () => {
      const { wrapper } = setup({}, 'everyone');
      const hook = await renderHook(({ scope }: { scope: FeedScope }) => useFeed(scope, 2), {
        initialProps: { scope: 'everyone' as FeedScope },
        wrapper,
      });
      await flush();

      await act(async () => {
        hook.result.current.loadMore();
      });
      await flush();
      expect(hook.result.current.posts).toHaveLength(4);

      await act(async () => {
        await hook.result.current.refresh();
      });
      await flush();

      expect(hook.result.current.posts).toHaveLength(2);
      expect(hook.result.current.hasMore).toBe(true);
    });
  });
});

describe('swapMine', () => {
  it('eski türü -1, yeniyi +1 yapar; 0 olan tür anahtardan düşer; girdiyi değiştirmez', () => {
    const counts = { clap: 1, water: 4 };
    expect(swapMine(counts, 'clap', 'heart')).toEqual({ water: 4, heart: 1 });
    expect(swapMine(counts, null, 'water')).toEqual({ clap: 1, water: 5 });
    expect(swapMine(counts, 'water', null)).toEqual({ clap: 1, water: 3 });
    expect(swapMine(counts, 'clap', 'clap')).toEqual(counts);
    expect(swapMine(counts, null, null)).toEqual(counts);
    expect(counts).toEqual({ clap: 1, water: 4 });
  });
});

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
import type { FeedPost } from '@/types';

import { NOTICE_MS, useFeed } from './useFeed';

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
    expect(post(result, 'post-002').clapCount).toBe(25);
    expect(post(result, 'post-002').myReactions.clapped).toBe(true);
    await flush();

    await rerender({ scope: 'friends' });
    expect(post(result, 'post-002').clapCount).toBe(25);
    expect(post(result, 'post-002').myReactions.clapped).toBe(true);
  });

  it('hata olursa geri alır, bildirimi `${postId}:${kind}` anahtarıyla verir ve 6 sn sonra kaldırır', async () => {
    const { result } = await renderFeedHook({
      setClap: jest.fn().mockRejectedValue(new ServiceError('network', 'x')),
    });
    await flush();

    await act(async () => result.current.react('post-002', 'clap'));
    await flush();
    expect(post(result, 'post-002').clapCount).toBe(24);
    expect(post(result, 'post-002').myReactions.clapped).toBe(false);
    expect(result.current.notice).toEqual({ key: 'post-002:clap', text: 'Alkış gönderilemedi. Tekrar dene.' });

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

  it('başka tepkinin dokunuşu mesajı silmez; aynı tepkinin yeni dokunuşu siler', async () => {
    const pending = defer<FeedPost>();
    const { result } = await renderFeedHook({
      setClap: jest
        .fn()
        .mockRejectedValueOnce(new ServiceError('network', 'x'))
        .mockImplementation(() => pending.promise),
      setWater: jest.fn(() => pending.promise),
    });
    await flush();
    await act(async () => result.current.react('post-002', 'clap'));
    await flush();
    expect(result.current.notice?.key).toBe('post-002:clap');

    await act(async () => result.current.react('post-002', 'water'));
    expect(result.current.notice?.key).toBe('post-002:clap');

    await act(async () => result.current.react('post-002', 'clap'));
    expect(result.current.notice).toBeNull();
  });

  it('tepki uçuştayken yenileme iyimser durumu ezmez ve istek sahipsiz kalmaz', async () => {
    const pending = defer<void>();
    const base = createMockServices();
    const setClap = jest.fn(async (id: string, value: boolean) => {
      await pending.promise;
      return base.feed.setClap(id, value);
    });
    const { result } = await renderFeedHook({ setClap }, 'friends');
    await flush();

    await act(async () => result.current.react('post-002', 'clap'));
    await act(async () => {
      await result.current.refresh();
    });
    // Sunucu henüz eski değeri döndü; kullanıcının tepkisi ve sayısı korunur.
    expect(post(result, 'post-002').myReactions.clapped).toBe(true);
    expect(post(result, 'post-002').clapCount).toBe(25);

    // Yenileme sırasında ikinci dokunuş da aynı döngüye girer: son istenen değer gönderilir.
    await act(async () => result.current.react('post-002', 'clap'));
    expect(post(result, 'post-002').clapCount).toBe(24);
    await act(async () => pending.resolve());
    expect(setClap.mock.calls.map((c) => c[1])).toEqual([true, false]);
    expect(post(result, 'post-002').clapCount).toBe(24);
    expect(post(result, 'post-002').myReactions.clapped).toBe(false);
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
    expect(post(result, 'post-002').clapCount).toBe(25);

    // Yanıt tepkiden önceki sunucu durumunu taşıyor (24, alkışsız).
    await act(async () => {
      late.resolve(stale);
      await refreshing;
    });
    expect(post(result, 'post-002').myReactions.clapped).toBe(true);
    expect(post(result, 'post-002').clapCount).toBe(25);
  });

  it('yenileme başlamadan önce onaylanan tepki yeni yanıtla (sunucu gerçeğiyle) güncellenir', async () => {
    const { result } = await renderFeedHook();
    await flush();
    await act(async () => result.current.react('post-002', 'clap'));
    await flush();
    await act(async () => {
      await result.current.refresh();
    });
    expect(post(result, 'post-002').clapCount).toBe(25);
    expect(post(result, 'post-002').myReactions.clapped).toBe(true);
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
    const { result, unmount } = await renderFeedHook({ setClap: jest.fn(() => pending.promise) });
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
      setWater: jest.fn().mockRejectedValue(new ServiceError('network', 'x')),
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
});

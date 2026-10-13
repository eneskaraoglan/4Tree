import { useCallback, useEffect, useRef, useState } from 'react';

import { trFeed } from '@/i18n';
import { useServices, type FeedScope } from '@/services';
import type { FeedPost, ReactionCounts, ReactionType } from '@/types';

export type FeedNotice = {
  /** Tepki hatası için `${postId}:reaction`; ekran geneli için SCREEN_NOTICE. */
  key: string;
  text: string;
};

export const SCREEN_NOTICE = 'screen';
export const NOTICE_MS = 6000;

/**
 * Bir gönderideki kullanıcı tepkisinin gönderim durumu. Kişi başına tek tepki olduğundan gönderi başına
 * tek kayıt tutulur. İstekler sıraya dizilir: kullanıcı hızlı değiştirirse son istenen değer (`desired`)
 * tek döngüde gönderilir, yanıtlar birbirini ezmez.
 */
type ReactionSync = {
  busy: boolean;
  desired: ReactionType | null;
  /** Sunucunun onayladığı son tepki ve o andaki sayılar; hata olursa buna dönülür. */
  confirmed: ReactionType | null;
  confirmedCounts: ReactionCounts;
  /** Son kez sonuçlandığı (onay ya da geri alma) sıra numarası; 0 = hiç sonuçlanmadı. */
  settledSeq: number;
};

const SCOPES: FeedScope[] = ['friends', 'everyone'];

const noticeKey = (postId: string) => `${postId}:reaction`;

/**
 * Sayılardaki benim payımı değiştirir: eski tepkinin sayısı -1, yenisi +1 (null olan taraf atlanır).
 * Sayısı 0'a inen tür anahtardan düşer.
 */
export function swapMine(counts: ReactionCounts, from: ReactionType | null, to: ReactionType | null): ReactionCounts {
  if (from === to) return { ...counts };
  const next: ReactionCounts = { ...counts };
  if (from) {
    const left = (next[from] ?? 0) - 1;
    if (left > 0) next[from] = left;
    else delete next[from];
  }
  if (to) next[to] = (next[to] ?? 0) + 1;
  return next;
}

function patchPost(post: FeedPost, mine: ReactionType | null, counts: ReactionCounts): FeedPost {
  return { ...post, myReaction: mine, reactionCounts: counts };
}

/**
 * Yeni gelen listeye, istek başladığında (`sinceSeq`) uçuşta olan ya da sonrasında sonuçlanan tepkileri
 * uygular: yanıt kullanıcının iyimser ya da yeni onaylanmış durumunu ezmesin (yanıt, tepkiden önceki
 * sunucu durumunu taşıyor olabilir). Sayı, sunucudaki sayıdan benim payım çıkarılıp eklenerek bulunur.
 */
function applyPending(list: FeedPost[], sync: Map<string, ReactionSync>, sinceSeq: number): FeedPost[] {
  if (sync.size === 0) return list;
  return list.map((post) => {
    const entry = sync.get(post.id);
    if (!entry || (!entry.busy && entry.settledSeq <= sinceSeq)) return post;
    return patchPost(post, entry.desired, swapMine(post.reactionCounts, post.myReaction, entry.desired));
  });
}

export const DEFAULT_PAGE_SIZE = 10;

type ScopeState = {
  status: 'loading' | 'error' | 'ready';
  error: unknown;
  posts: FeedPost[];
  hasMore: boolean;
  loadingMore: boolean;
};
type Cache = Partial<Record<FeedScope, ScopeState>>;

export type FeedData = {
  status: 'loading' | 'error' | 'ready';
  error: unknown;
  posts: FeedPost[];
  refreshing: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  notice: FeedNotice | null;
  retry: () => void;
  refresh: () => Promise<void>;
  loadMore: () => void;
  /** Tepkiyi belirler (önceki tepkinin yerine geçer); null geri alır. */
  react: (postId: string, reaction: ReactionType | null) => void;
  /** Servisin desteklediği tepki türleri; seçici yalnız bunları gösterir. */
  supportedReactions: readonly ReactionType[];
  /** Kendi gönderisini siler ve önbellekten çıkarır. */
  deleteFeedPost: (postId: string) => Promise<void>;
  /** Kendi gönderisinin açıklamasını günceller ve önbelleğe yansıtır. */
  editFeedPost: (postId: string, patch: { caption?: string }) => Promise<FeedPost>;
};

const requestCounters = (): Record<FeedScope, number> => ({ friends: 0, everyone: 0 });

/**
 * Feed verisi: sadece FeedService üzerinden. Her sekme (scope) için ayrı önbellek ve ayrı istek numarası
 * tutulur; hızlı sekme değişiminde bir sekmenin yanıtı ötekini ezmez. Tepkiler iyimser güncellenir,
 * hata olursa geri alınır; tepki iki sekmedeki aynı gönderiye birden uygulanır.
 */
export function useFeed(scope: FeedScope, pageSize: number = DEFAULT_PAGE_SIZE): FeedData {
  const { feed } = useServices();
  const [cache, setCache] = useState<Cache>({});
  const [refreshingScope, setRefreshingScope] = useState<FeedScope | null>(null);
  const [notice, setNotice] = useState<FeedNotice | null>(null);

  const cacheRef = useRef<Cache>({});
  const syncRef = useRef(new Map<string, ReactionSync>());
  const mountedRef = useRef(true);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Sekme başına yükleme/yenileme numarası; sadece en yenisinin yanıtı uygulanır. */
  const requestRef = useRef(requestCounters());
  const loadingRef = useRef(new Set<FeedScope>());
  const refreshingRef = useRef(new Set<FeedScope>());
  /** Yükleme başlangıçları ve tepki sonuçları için artan sıra numarası. */
  const seqRef = useRef(0);

  useEffect(() => {
    cacheRef.current = cache;
  }, [cache]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  const setScopeState = useCallback((target: FeedScope, state: ScopeState) => {
    setCache((prev) => ({ ...prev, [target]: state }));
  }, []);

  const showNotice = useCallback((key: string, text: string) => {
    if (!mountedRef.current) return;
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice({ key, text });
    noticeTimer.current = setTimeout(() => {
      noticeTimer.current = null;
      setNotice(null);
    }, NOTICE_MS);
  }, []);

  /** Sekmeyi yükler (durumu 'loading'e çekmeden; ilk yüklemede girdi yoksa zaten loading sayılır). */
  const load = useCallback(
    (target: FeedScope) => {
      requestRef.current[target] += 1;
      const id = requestRef.current[target];
      seqRef.current += 1;
      const startSeq = seqRef.current;
      loadingRef.current.add(target);
      feed
        .getPosts(target, { limit: pageSize })
        .then((loaded) => {
          if (id !== requestRef.current[target] || !mountedRef.current) return;
          const hasMore = loaded.length >= pageSize;
          setScopeState(target, {
            status: 'ready',
            error: null,
            posts: applyPending(loaded, syncRef.current, startSeq),
            hasMore,
            loadingMore: false,
          });
        })
        .catch((e: unknown) => {
          if (id !== requestRef.current[target] || !mountedRef.current) return;
          setScopeState(target, {
            status: 'error',
            error: e,
            posts: [],
            hasMore: false,
            loadingMore: false,
          });
        })
        .finally(() => {
          if (id === requestRef.current[target]) loadingRef.current.delete(target);
        });
    },
    [feed, pageSize, setScopeState],
  );

  // Sekme ilk kez açılınca yüklenir; daha önce yüklendiyse önbellek gösterilir.
  useEffect(() => {
    if (cacheRef.current[scope] || loadingRef.current.has(scope)) return;
    load(scope);
  }, [scope, load]);

  const retry = useCallback(() => {
    setScopeState(scope, {
      status: 'loading',
      error: null,
      posts: [],
      hasMore: true,
      loadingMore: false,
    });
    load(scope);
  }, [scope, load, setScopeState]);

  const refresh = useCallback(async () => {
    const target = scope;
    // Aynı sekmede yenileme sürerken gelen ikinci çekme yok sayılır.
    if (refreshingRef.current.has(target)) return;
    refreshingRef.current.add(target);
    requestRef.current[target] += 1;
    const id = requestRef.current[target];
    seqRef.current += 1;
    const startSeq = seqRef.current;
    setRefreshingScope(target);
    try {
      const loaded = await feed.getPosts(target, { limit: pageSize });
      if (!mountedRef.current || id !== requestRef.current[target]) return;
      const hasMore = loaded.length >= pageSize;
      setScopeState(target, {
        status: 'ready',
        error: null,
        posts: applyPending(loaded, syncRef.current, startSeq),
        hasMore,
        loadingMore: false,
      });
    } catch (e) {
      if (!mountedRef.current || id !== requestRef.current[target]) return;
      // Elde gösterilecek akış varsa onu koru, kısa bir mesaj ver.
      if ((cacheRef.current[target]?.posts.length ?? 0) > 0) showNotice(SCREEN_NOTICE, trFeed.error.refresh);
      else {
        setScopeState(target, {
          status: 'error',
          error: e,
          posts: [],
          hasMore: false,
          loadingMore: false,
        });
      }
    } finally {
      refreshingRef.current.delete(target);
      if (mountedRef.current) setRefreshingScope((current) => (current === target ? null : current));
    }
  }, [feed, pageSize, scope, setScopeState, showNotice]);

  const loadMore = useCallback(async () => {
    const target = scope;
    const current = cacheRef.current[target];
    if (!current || current.status !== 'ready' || current.loadingMore || !current.hasMore) {
      return;
    }
    const posts = current.posts;
    const last = posts[posts.length - 1];
    if (!last) return;

    setScopeState(target, { ...current, loadingMore: true });
    seqRef.current += 1;
    const startSeq = seqRef.current;
    try {
      const more = await feed.getPosts(target, {
        cursor: last.createdAt ?? last.id,
        limit: pageSize,
      });
      if (!mountedRef.current) return;
      const latestCurrent = cacheRef.current[target];
      if (!latestCurrent || latestCurrent.status !== 'ready') return;

      const existingIds = new Set(latestCurrent.posts.map((p) => p.id));
      const filtered = more.filter((p) => !existingIds.has(p.id));
      const hasMore = more.length >= pageSize && filtered.length > 0;
      setScopeState(target, {
        ...latestCurrent,
        loadingMore: false,
        hasMore,
        posts: [...latestCurrent.posts, ...applyPending(filtered, syncRef.current, startSeq)],
      });
    } catch {
      if (!mountedRef.current) return;
      const latestCurrent = cacheRef.current[target];
      if (latestCurrent) {
        setScopeState(target, { ...latestCurrent, loadingMore: false });
        showNotice(SCREEN_NOTICE, trFeed.pagination.loadMoreError);
      }
    }
  }, [feed, pageSize, scope, setScopeState, showNotice]);

  const updatePost = useCallback((postId: string, mine: ReactionType | null, counts: ReactionCounts) => {
    if (!mountedRef.current) return;
    setCache((prev) => {
      const next: Cache = { ...prev };
      for (const key of SCOPES) {
        const state = prev[key];
        if (state) next[key] = { ...state, posts: state.posts.map((p) => (p.id === postId ? patchPost(p, mine, counts) : p)) };
      }
      return next;
    });
  }, []);

  const flush = useCallback(
    async (postId: string, entry: ReactionSync) => {
      try {
        while (entry.confirmed !== entry.desired) {
          const value = entry.desired;
          const updated = await feed.setReaction(postId, value);
          entry.confirmed = value;
          entry.confirmedCounts = updated.reactionCounts;
          seqRef.current += 1;
          entry.settledSeq = seqRef.current;
          // Bu sırada yeni seçim geldiyse (desired değiştiyse) sıradaki tur onu gönderir.
          if (entry.desired === value) updatePost(postId, value, entry.confirmedCounts);
        }
      } catch {
        entry.desired = entry.confirmed;
        seqRef.current += 1;
        entry.settledSeq = seqRef.current;
        updatePost(postId, entry.confirmed, entry.confirmedCounts);
        showNotice(noticeKey(postId), trFeed.reactions.error);
      } finally {
        entry.busy = false;
      }
    },
    [feed, showNotice, updatePost],
  );

  const react = useCallback(
    (postId: string, reaction: ReactionType | null) => {
      let entry = syncRef.current.get(postId);
      if (!entry || !entry.busy) {
        const post = [scope, ...SCOPES]
          .map((s) => cacheRef.current[s]?.posts.find((p) => p.id === postId))
          .find((p) => p !== undefined);
        if (!post) return;
        entry = {
          busy: false,
          desired: post.myReaction,
          confirmed: post.myReaction,
          confirmedCounts: post.reactionCounts,
          settledSeq: 0,
        };
        syncRef.current.set(postId, entry);
      }
      entry.desired = reaction;
      // İyimser güncelleme: sayı, onaylı sayılardan eski tepkim -1, yenisi +1 yapılarak bulunur.
      updatePost(postId, reaction, swapMine(entry.confirmedCounts, entry.confirmed, reaction));
      // Aynı gönderinin eski tepki mesajı kalkar; başka gönderinin mesajına dokunulmaz.
      const key = noticeKey(postId);
      setNotice((n) => (n?.key === key ? null : n));
      if (entry.busy) return;
      entry.busy = true;
      void flush(postId, entry);
    },
    [scope, flush, updatePost],
  );

  const deleteFeedPost = useCallback(
    async (postId: string) => {
      await feed.deletePost(postId);
      setCache((prev) => {
        const next: Cache = {};
        for (const s of SCOPES) {
          const state = prev[s];
          if (!state) continue;
          next[s] = {
            ...state,
            posts: state.posts.filter((p) => p.id !== postId),
          };
        }
        return next;
      });
    },
    [feed],
  );

  const editFeedPost = useCallback(
    async (postId: string, patch: { caption?: string }) => {
      const updated = await feed.updatePost(postId, patch);
      setCache((prev) => {
        const next: Cache = {};
        for (const s of SCOPES) {
          const state = prev[s];
          if (!state) continue;
          next[s] = {
            ...state,
            posts: state.posts.map((p) => (p.id === postId ? { ...p, caption: updated.caption } : p)),
          };
        }
        return next;
      });
      return updated;
    },
    [feed],
  );

  const current = cache[scope];
  return {
    status: current?.status ?? 'loading',
    error: current?.error ?? null,
    posts: current?.posts ?? [],
    refreshing: refreshingScope === scope,
    hasMore: current?.hasMore ?? true,
    loadingMore: current?.loadingMore ?? false,
    notice,
    retry,
    refresh,
    loadMore,
    react,
    supportedReactions: feed.supportedReactions,
    deleteFeedPost,
    editFeedPost,
  };
}

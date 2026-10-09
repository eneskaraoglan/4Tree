import { useCallback, useEffect, useRef, useState } from 'react';

import { trFeed } from '@/i18n';
import { useServices, type FeedScope } from '@/services';
import type { FeedPost } from '@/types';

import type { ReactionKind } from './ReactionButton';

export type FeedNotice = {
  /** Tepki hatası için `${postId}:${kind}`; ekran geneli için SCREEN_NOTICE. */
  key: string;
  text: string;
};

export const SCREEN_NOTICE = 'screen';
export const NOTICE_MS = 6000;

/**
 * Bir (gönderi, tepki) çifti için gönderim durumu. İstekler sıraya dizilir: kullanıcı hızlı
 * dokunursa son istenen değer (`desired`) tek döngüde gönderilir, yanıtlar birbirini ezmez.
 */
type ReactionSync = {
  busy: boolean;
  desired: boolean;
  /** Sunucunun onayladığı son değer ve o andaki sayı; hata olursa buna dönülür. */
  confirmed: boolean;
  confirmedCount: number;
  /** Son kez sonuçlandığı (onay ya da geri alma) sıra numarası; 0 = hiç sonuçlanmadı. */
  settledSeq: number;
};

const KINDS: ReactionKind[] = ['clap', 'water'];
const SCOPES: FeedScope[] = ['friends', 'everyone'];

const reactionKey = (postId: string, kind: ReactionKind) => `${postId}:${kind}`;

function valueOf(post: FeedPost, kind: ReactionKind): { value: boolean; count: number } {
  return kind === 'clap'
    ? { value: post.myReactions.clapped, count: post.clapCount }
    : { value: post.myReactions.watered, count: post.waterCount };
}

function patchPost(post: FeedPost, kind: ReactionKind, value: boolean, count: number): FeedPost {
  return kind === 'clap'
    ? { ...post, clapCount: count, myReactions: { ...post.myReactions, clapped: value } }
    : { ...post, waterCount: count, myReactions: { ...post.myReactions, watered: value } };
}

/**
 * Yeni gelen listeye, istek başladığında (`sinceSeq`) uçuşta olan ya da sonrasında sonuçlanan tepkileri
 * uygular: yanıt kullanıcının iyimser ya da yeni onaylanmış durumunu ezmesin (yanıt, tepkiden önceki
 * sunucu durumunu taşıyor olabilir). Sayı, sunucudaki sayıdan benim payım çıkarılıp eklenerek bulunur.
 */
function applyPending(list: FeedPost[], sync: Map<string, ReactionSync>, sinceSeq: number): FeedPost[] {
  if (sync.size === 0) return list;
  return list.map((post) => {
    let next = post;
    for (const kind of KINDS) {
      const entry = sync.get(reactionKey(post.id, kind));
      if (!entry || (!entry.busy && entry.settledSeq <= sinceSeq)) continue;
      const server = valueOf(post, kind);
      const others = server.count - (server.value ? 1 : 0);
      next = patchPost(next, kind, entry.desired, others + (entry.desired ? 1 : 0));
    }
    return next;
  });
}

type ScopeState = { status: 'loading' | 'error' | 'ready'; error: unknown; posts: FeedPost[] };
type Cache = Partial<Record<FeedScope, ScopeState>>;

export type FeedData = {
  status: 'loading' | 'error' | 'ready';
  error: unknown;
  posts: FeedPost[];
  refreshing: boolean;
  notice: FeedNotice | null;
  retry: () => void;
  refresh: () => Promise<void>;
  react: (postId: string, kind: ReactionKind) => void;
};

const requestCounters = (): Record<FeedScope, number> => ({ friends: 0, everyone: 0 });

/**
 * Feed verisi: sadece FeedService üzerinden. Her sekme (scope) için ayrı önbellek ve ayrı istek numarası
 * tutulur; hızlı sekme değişiminde bir sekmenin yanıtı ötekini ezmez. Tepkiler iyimser güncellenir,
 * hata olursa geri alınır; tepki iki sekmedeki aynı gönderiye birden uygulanır.
 */
export function useFeed(scope: FeedScope): FeedData {
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
        .getPosts(target)
        .then((loaded) => {
          if (id !== requestRef.current[target] || !mountedRef.current) return;
          setScopeState(target, { status: 'ready', error: null, posts: applyPending(loaded, syncRef.current, startSeq) });
        })
        .catch((e: unknown) => {
          if (id !== requestRef.current[target] || !mountedRef.current) return;
          setScopeState(target, { status: 'error', error: e, posts: [] });
        })
        .finally(() => {
          if (id === requestRef.current[target]) loadingRef.current.delete(target);
        });
    },
    [feed, setScopeState],
  );

  // Sekme ilk kez açılınca yüklenir; daha önce yüklendiyse önbellek gösterilir.
  useEffect(() => {
    if (cacheRef.current[scope] || loadingRef.current.has(scope)) return;
    load(scope);
  }, [scope, load]);

  const retry = useCallback(() => {
    setScopeState(scope, { status: 'loading', error: null, posts: [] });
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
      const loaded = await feed.getPosts(target);
      if (!mountedRef.current || id !== requestRef.current[target]) return;
      setScopeState(target, { status: 'ready', error: null, posts: applyPending(loaded, syncRef.current, startSeq) });
    } catch (e) {
      if (!mountedRef.current || id !== requestRef.current[target]) return;
      // Elde gösterilecek akış varsa onu koru, kısa bir mesaj ver.
      if ((cacheRef.current[target]?.posts.length ?? 0) > 0) showNotice(SCREEN_NOTICE, trFeed.error.refresh);
      else setScopeState(target, { status: 'error', error: e, posts: [] });
    } finally {
      refreshingRef.current.delete(target);
      if (mountedRef.current) setRefreshingScope((current) => (current === target ? null : current));
    }
  }, [feed, scope, setScopeState, showNotice]);

  const updatePost = useCallback((postId: string, kind: ReactionKind, value: boolean, count: number) => {
    if (!mountedRef.current) return;
    setCache((prev) => {
      const next: Cache = { ...prev };
      for (const key of SCOPES) {
        const state = prev[key];
        if (state) next[key] = { ...state, posts: state.posts.map((p) => (p.id === postId ? patchPost(p, kind, value, count) : p)) };
      }
      return next;
    });
  }, []);

  const flush = useCallback(
    async (postId: string, kind: ReactionKind, entry: ReactionSync) => {
      try {
        while (entry.confirmed !== entry.desired) {
          const value = entry.desired;
          const updated = await (kind === 'clap' ? feed.setClap(postId, value) : feed.setWater(postId, value));
          entry.confirmed = value;
          entry.confirmedCount = valueOf(updated, kind).count;
          seqRef.current += 1;
          entry.settledSeq = seqRef.current;
          // Bu sırada yeni dokunuş geldiyse (desired değiştiyse) sıradaki tur onu gönderir.
          if (entry.desired === value) updatePost(postId, kind, value, entry.confirmedCount);
        }
      } catch {
        entry.desired = entry.confirmed;
        seqRef.current += 1;
        entry.settledSeq = seqRef.current;
        updatePost(postId, kind, entry.confirmed, entry.confirmedCount);
        showNotice(reactionKey(postId, kind), trFeed.reactions[kind].error);
      } finally {
        entry.busy = false;
      }
    },
    [feed, showNotice, updatePost],
  );

  const react = useCallback(
    (postId: string, kind: ReactionKind) => {
      const key = reactionKey(postId, kind);
      let entry = syncRef.current.get(key);
      if (!entry || !entry.busy) {
        const post = [scope, ...SCOPES]
          .map((s) => cacheRef.current[s]?.posts.find((p) => p.id === postId))
          .find((p) => p !== undefined);
        if (!post) return;
        const current = valueOf(post, kind);
        entry = { busy: false, desired: current.value, confirmed: current.value, confirmedCount: current.count, settledSeq: 0 };
        syncRef.current.set(key, entry);
      }
      entry.desired = !entry.desired;
      // İyimser güncelleme: sayı, onaylı değerden benim payım çıkarılıp istenen değer eklenerek bulunur.
      const others = entry.confirmedCount - (entry.confirmed ? 1 : 0);
      updatePost(postId, kind, entry.desired, others + (entry.desired ? 1 : 0));
      // Yalnız aynı tepkinin eski mesajı kalkar; aynı gönderideki diğer tepkinin mesajına dokunulmaz.
      setNotice((n) => (n?.key === key ? null : n));
      if (entry.busy) return;
      entry.busy = true;
      void flush(postId, kind, entry);
    },
    [scope, flush, updatePost],
  );

  const current = cache[scope];
  return {
    status: current?.status ?? 'loading',
    error: current?.error ?? null,
    posts: current?.posts ?? [],
    refreshing: refreshingScope === scope,
    notice,
    retry,
    refresh,
    react,
  };
}

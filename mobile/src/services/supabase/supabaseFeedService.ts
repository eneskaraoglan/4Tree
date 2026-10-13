import type { FeedComment, FeedPost, ReactionCounts, ReactionType } from '@/types';

import type { CreatePostInput, FeedPaginationOptions, FeedScope, FeedService } from '../FeedService';
import { computePace, guard, requireUserId, serviceError, throwIfError } from './supabaseHelpers';
import { supabase } from './supabaseClient';

/** Sayfalama arayüzde yok; `in (...)` sorgusunun şişmemesi için tek seferde en çok bu kadar gönderi. */
const FEED_LIMIT = 100;

const POST_COLUMNS =
  'id, user_id, author_name, author_avatar_initial, caption, activity_type, distance_m, duration_secs, ' +
  'place, trees_earned, clap_count, water_count, comment_count, created_at, is_friend';

/**
 * Veritabanındaki `reaction_type` enum'u şimdilik yalnız bunları taşır. BACKEND NOTU: enum
 * 'leaf' | 'heart' | 'power' ile genişletilene kadar arayüz seçicide yalnız bunları gösterir.
 */
const SUPPORTED_REACTIONS = ['water', 'clap'] as const satisfies readonly ReactionType[];

type PostRow = {
  id: string;
  user_id: string;
  author_name: string | null;
  author_avatar_initial: string | null;
  caption: string | null;
  activity_type: string | null;
  distance_m: number | string | null;
  duration_secs: number | string | null;
  place: string | null;
  trees_earned: number | string | null;
  clap_count: number | string | null;
  water_count: number | string | null;
  comment_count: number | string | null;
  created_at: string;
  is_friend: boolean | null;
};

type ReactionRow = { post_id: string; reaction: string; created_at?: string | null };

type CommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  parent_id?: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_initial: string | null;
};

const isSupported = (reaction: string): reaction is ReactionType =>
  (SUPPORTED_REACTIONS as readonly string[]).includes(reaction);

/** Kişi başına tek tepki beklenir; eski şemadan birden fazla satır kalmışsa en yenisi geçerlidir. */
function latestReaction(postId: string, mine: ReactionRow[]): ReactionType | null {
  let latest: ReactionRow | null = null;
  for (const r of mine) {
    if (r.post_id !== postId || !isSupported(r.reaction)) continue;
    if (!latest || (r.created_at ?? '') >= (latest.created_at ?? '')) latest = r;
  }
  return latest ? (latest.reaction as ReactionType) : null;
}

function toCounts(row: PostRow): ReactionCounts {
  const counts: ReactionCounts = {};
  const clap = Number(row.clap_count ?? 0);
  const water = Number(row.water_count ?? 0);
  if (water > 0) counts.water = water;
  if (clap > 0) counts.clap = clap;
  return counts;
}

function toPost(row: PostRow, mine: ReactionRow[]): FeedPost {
  const distanceKm = Number(row.distance_m ?? 0) / 1000;
  const durationSec = Number(row.duration_secs ?? 0);
  const name = row.author_name?.trim() || 'Kullanıcı';
  return {
    id: row.id,
    author: {
      id: row.user_id,
      name,
      avatarInitial: row.author_avatar_initial?.trim() || name.charAt(0).toUpperCase(),
    },
    isFriend: row.is_friend === true,
    ...(row.caption ? { caption: row.caption } : {}),
    activity: {
      type: row.activity_type === 'walk' ? 'walk' : 'run',
      distanceKm,
      durationSec,
      paceSecPerKm: computePace(distanceKm, durationSec),
      place: row.place ?? '',
      // feed_posts_view rota döndürmez (backend notu); route bilerek boş bırakılır.
    },
    treesEarned: Number(row.trees_earned ?? 0),
    reactionCounts: toCounts(row),
    myReaction: latestReaction(row.id, mine),
    commentCount: Number(row.comment_count ?? 0),
    createdAt: row.created_at,
  };
}

/** Giriş yapan kullanıcının verilen gönderilerdeki tepkileri, tek sorguda. */
async function fetchMyReactions(userId: string, postIds: string[]): Promise<ReactionRow[]> {
  if (postIds.length === 0) return [];
  const { data, error } = await supabase
    .from('post_reactions')
    .select('post_id, reaction, created_at')
    .eq('user_id', userId)
    .in('post_id', postIds);
  throwIfError(error);
  return (data ?? []) as ReactionRow[];
}

async function fetchPost(userId: string, postId: string): Promise<FeedPost> {
  const [post, mine] = await Promise.all([
    supabase.from('feed_posts_view').select(POST_COLUMNS).eq('id', postId).maybeSingle(),
    fetchMyReactions(userId, [postId]),
  ]);
  throwIfError(post.error, { badIdIsNotFound: true });
  if (!post.data) throw serviceError('not_found', 'Bu gönderi artık yok.');
  return toPost(post.data as unknown as PostRow, mine);
}

/**
 * Tek tepki modeli: kullanıcının bu gönderideki mevcut tepkileri silinir, sonra seçilen eklenir (null: yalnız silme).
 * İki çağrı atomik değildir (BACKEND NOTU: UNIQUE(post_id, user_id) + UPDATE politikası ile tek upsert olmalı).
 * Sayıları sunucu tetikleyicisi günceller; istemci saymaz, güncel gönderiyi yeniden okuyup döner.
 */
async function setReaction(postId: string, reaction: ReactionType | null): Promise<FeedPost> {
  if (reaction !== null && !isSupported(reaction)) throw serviceError('invalid', 'Bu tepki desteklenmiyor.');
  const userId = await requireUserId();
  const removal = await supabase.from('post_reactions').delete().eq('post_id', postId).eq('user_id', userId);
  throwIfError(removal.error, { badIdIsNotFound: true });
  if (reaction !== null) {
    const { error } = await supabase
      .from('post_reactions')
      .upsert(
        { post_id: postId, user_id: userId, reaction },
        { onConflict: 'post_id,user_id,reaction', ignoreDuplicates: true },
      );
    throwIfError(error, { badIdIsNotFound: true });
  }
  return fetchPost(userId, postId);
}

async function fetchComments(postId: string): Promise<FeedComment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('id, post_id, user_id, body, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  throwIfError(error, { badIdIsNotFound: true });
  const rows = (data ?? []) as unknown as CommentRow[];
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profilesData } = await supabase
    .from('users_profile')
    .select('id, display_name, avatar_initial')
    .in('id', userIds);

  const profilesMap = new Map<string, ProfileRow>();
  ((profilesData ?? []) as unknown as ProfileRow[]).forEach((p) => {
    profilesMap.set(p.id, p);
  });

  const converted: FeedComment[] = rows.map((r) => {
    const p = profilesMap.get(r.user_id);
    const name = p?.display_name?.trim() || 'Kullanıcı';
    return {
      id: r.id,
      postId: r.post_id,
      author: {
        id: r.user_id,
        name,
        avatarInitial: p?.avatar_initial?.trim() || name.charAt(0).toUpperCase(),
      },
      body: r.body,
      parentId: r.parent_id ?? null,
      reactionCounts: {},
      myReaction: null,
      createdAt: r.created_at,
      replies: [],
    };
  });

  const topLevel = converted.filter((c) => !c.parentId);
  return topLevel.map((parent) => ({
    ...parent,
    replies: converted.filter((r) => r.parentId === parent.id),
  }));
}

async function addComment(postId: string, body: string, parentId?: string | null): Promise<FeedComment> {
  const trimmed = body.trim();
  if (!trimmed) throw serviceError('invalid', 'Yorum metni boş olamaz.');
  const userId = await requireUserId();
  const insertPayload: Record<string, unknown> = {
    post_id: postId,
    user_id: userId,
    body: trimmed,
  };
  if (parentId) {
    insertPayload.parent_id = parentId;
  }
  const { data, error } = await supabase
    .from('comments')
    .insert(insertPayload)
    .select('id, post_id, user_id, body, created_at')
    .single();
  throwIfError(error, { badIdIsNotFound: true });
  const row = data as unknown as CommentRow;

  const { data: profileData } = await supabase
    .from('users_profile')
    .select('display_name, avatar_initial')
    .eq('id', userId)
    .maybeSingle();
  const name = (profileData as unknown as ProfileRow | null)?.display_name?.trim() || 'Kullanıcı';
  return {
    id: row.id,
    postId: row.post_id,
    author: {
      id: userId,
      name,
      avatarInitial: (profileData as unknown as ProfileRow | null)?.avatar_initial?.trim() || name.charAt(0).toUpperCase(),
    },
    body: row.body,
    parentId: parentId ?? null,
    reactionCounts: {},
    myReaction: null,
    createdAt: row.created_at,
    replies: [],
  };
}

async function deleteComment(commentId: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId);
  throwIfError(error, { badIdIsNotFound: true });
}

export function createSupabaseFeedService(): FeedService {
  return {
    supportedReactions: SUPPORTED_REACTIONS,
    getPosts: (scope: FeedScope = 'everyone', options?: FeedPaginationOptions) =>
      guard(async () => {
        const userId = await requireUserId();
        let query = supabase.from('feed_posts_view').select(POST_COLUMNS);
        if (scope === 'friends') query = query.eq('is_friend', true);
        if (options?.cursor) {
          query = query.lt('created_at', options.cursor);
        }
        const limit = options?.limit ?? FEED_LIMIT;
        const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
        throwIfError(error);

        const rows = (data ?? []) as unknown as PostRow[];
        const mine = await fetchMyReactions(
          userId,
          rows.map((r) => r.id),
        );
        return rows.map((row) => toPost(row, mine));
      }),

    getPost: (postId: string) => guard(async () => {
      const userId = await requireUserId();
      return fetchPost(userId, postId);
    }),

    createPost: (input: CreatePostInput) =>
      guard(async () => {
        const userId = await requireUserId();
        const { data, error } = await supabase
          .from('posts')
          .insert({
            user_id: userId,
            caption: input.caption,
            run_id: input.runId,
          })
          .select('id')
          .single();
        throwIfError(error);
        const newPostId = (data as { id: string }).id;
        return fetchPost(userId, newPostId);
      }),

    deletePost: (postId: string) =>
      guard(async () => {
        const userId = await requireUserId();
        const { error } = await supabase
          .from('posts')
          .delete()
          .eq('id', postId)
          .eq('user_id', userId);
        throwIfError(error, { badIdIsNotFound: true });
      }),

    updatePost: (postId: string, patch: { caption?: string }) =>
      guard(async () => {
        const userId = await requireUserId();
        const { error } = await supabase
          .from('posts')
          .update({ caption: patch.caption })
          .eq('id', postId)
          .eq('user_id', userId);
        throwIfError(error, { badIdIsNotFound: true });
        return fetchPost(userId, postId);
      }),

    setReaction: (postId, reaction) => guard(() => setReaction(postId, reaction)),

    getComments: (postId: string) => guard(() => fetchComments(postId)),

    addComment: (postId: string, body: string, parentId?: string | null) =>
      guard(() => addComment(postId, body, parentId)),

    deleteComment: (commentId: string) => guard(() => deleteComment(commentId)),

    setCommentReaction: (commentId: string, reaction: ReactionType | null) =>
      guard(async () => {
        // BACKEND NOTU (Enes): comment_reactions tablosu henüz yok.
        if (reaction !== null && !isSupported(reaction)) {
          throw serviceError('invalid', 'Bu tepki desteklenmiyor.');
        }
        return {
          id: commentId,
          postId: '',
          author: { id: '', name: '', avatarInitial: '' },
          body: '',
          reactionCounts: reaction ? { [reaction]: 1 } : {},
          myReaction: reaction,
          createdAt: new Date().toISOString(),
        };
      }),
  };
}

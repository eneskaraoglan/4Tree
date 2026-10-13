import type { FeedComment, FeedPost, ReactionType } from '@/types';

import { ServiceError } from '../errors';
import type { FeedService } from '../FeedService';
import { buildMockComments } from './mockFeed';

/** Mock hepsini destekler; sıra seçicideki sıradır. */
const ALL_REACTIONS: readonly ReactionType[] = ['water', 'clap', 'leaf', 'heart', 'power'];

/** Rota noktaları dahil derin kopya; dışarıdaki mutasyon iç durumu etkilemez. */
const copyPost = (p: FeedPost): FeedPost => ({
  ...p,
  author: { ...p.author },
  activity: {
    ...p.activity,
    ...(p.activity.route ? { route: p.activity.route.map((point) => ({ ...point })) } : {}),
  },
  reactionCounts: { ...p.reactionCounts },
});

const copyComment = (c: FeedComment): FeedComment => ({
  ...c,
  author: { ...c.author },
  reactionCounts: { ...c.reactionCounts },
  ...(c.replies ? { replies: c.replies.map(copyComment) } : {}),
});

/** Tepkiler ve yorumlar bellekte tutulur; durum her fabrika çağrısında bağımsızdır. */
export function createMockFeedService(initialPosts: FeedPost[], initialComments?: FeedComment[]): FeedService {
  const posts = initialPosts.map(copyPost);
  const comments = (initialComments ?? buildMockComments()).map(copyComment);

  const findPost = (id: string): FeedPost => {
    const post = posts.find((p) => p.id === id);
    if (!post) throw new ServiceError('not_found', 'Bu gönderi artık yok.');
    return post;
  };

  const findComment = (id: string): FeedComment => {
    const comment = comments.find((c) => c.id === id);
    if (!comment) throw new ServiceError('not_found', 'Bu yorum artık yok.');
    return comment;
  };

  return {
    supportedReactions: ALL_REACTIONS,
    getPosts: async (scope = 'everyone', options) => {
      let filtered = posts.filter((p) => scope === 'everyone' || p.isFriend);
      if (options?.cursor) {
        const idx = filtered.findIndex(
          (p) => p.id === options.cursor || p.createdAt === options.cursor,
        );
        if (idx !== -1) {
          filtered = filtered.slice(idx + 1);
        }
      }
      if (options?.limit && options.limit > 0) {
        filtered = filtered.slice(0, options.limit);
      }
      return filtered.map(copyPost);
    },
    getPost: async (postId: string) => copyPost(findPost(postId)),
    createPost: async (input) => {
      const newId = `post-${Date.now()}`;
      const distanceKm = input.distanceKm ?? 0;
      const durationSec = input.durationSec ?? 0;
      const newPost: FeedPost = {
        id: newId,
        author: { id: 'user-elif', name: 'Elif', avatarInitial: 'E' },
        isFriend: true,
        caption: input.caption,
        activity: {
          type: input.activityType ?? 'run',
          distanceKm,
          durationSec,
          paceSecPerKm: distanceKm > 0 ? Math.round(durationSec / distanceKm) : 0,
          place: input.place ?? '',
          route: input.route,
        },
        treesEarned: distanceKm > 0 ? Math.floor(distanceKm / 20) : 0,
        reactionCounts: {},
        myReaction: null,
        commentCount: 0,
        createdAt: new Date().toISOString(),
      };
      posts.unshift(newPost);
      return copyPost(newPost);
    },
    deletePost: async (postId: string) => {
      const idx = posts.findIndex((p) => p.id === postId);
      if (idx === -1) throw new ServiceError('not_found', 'Bu gönderi bulunamadı.');
      posts.splice(idx, 1);
    },
    updatePost: async (postId: string, patch: { caption?: string }) => {
      const post = findPost(postId);
      if (patch.caption !== undefined) {
        post.caption = patch.caption;
      }
      return copyPost(post);
    },
    setReaction: async (postId, reaction) => {
      if (reaction !== null && !ALL_REACTIONS.includes(reaction)) {
        throw new ServiceError('invalid', 'Bu tepki desteklenmiyor.');
      }
      const post = findPost(postId);
      if (post.myReaction !== reaction) {
        if (post.myReaction) {
          const left = (post.reactionCounts[post.myReaction] ?? 0) - 1;
          if (left > 0) post.reactionCounts[post.myReaction] = left;
          else delete post.reactionCounts[post.myReaction];
        }
        if (reaction) post.reactionCounts[reaction] = (post.reactionCounts[reaction] ?? 0) + 1;
        post.myReaction = reaction;
      }
      return copyPost(post);
    },
    getComments: async (postId: string) => {
      findPost(postId);
      const postComments = comments.filter((c) => c.postId === postId);
      const topLevel = postComments.filter((c) => !c.parentId);
      return topLevel.map((parent) => ({
        ...copyComment(parent),
        replies: postComments.filter((r) => r.parentId === parent.id).map(copyComment),
      }));
    },
    addComment: async (postId: string, body: string, parentId?: string | null) => {
      const trimmed = body.trim();
      if (!trimmed) throw new ServiceError('invalid', 'Yorum metni boş olamaz.');
      const post = findPost(postId);
      if (parentId) {
        const parent = findComment(parentId);
        if (parent.postId !== postId) {
          throw new ServiceError('invalid', 'Yanıtlanan yorum bu gönderiye ait değil.');
        }
      }
      const newComment: FeedComment = {
        id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        postId,
        author: { id: 'user-elif', name: 'Elif', avatarInitial: 'E' },
        body: trimmed,
        parentId: parentId ?? null,
        reactionCounts: {},
        myReaction: null,
        createdAt: new Date().toISOString(),
        replies: [],
      };
      comments.push(newComment);
      post.commentCount += 1;
      return copyComment(newComment);
    },
    deleteComment: async (commentId: string) => {
      const targetIndex = comments.findIndex((c) => c.id === commentId);
      if (targetIndex === -1) throw new ServiceError('not_found', 'Bu yorum artık yok.');
      const target = comments[targetIndex];
      const post = findPost(target.postId);
      const idsToDelete = new Set<string>([commentId]);
      comments.forEach((c) => {
        if (c.parentId === commentId) idsToDelete.add(c.id);
      });
      const deleteCount = idsToDelete.size;
      for (let i = comments.length - 1; i >= 0; i--) {
        if (idsToDelete.has(comments[i].id)) {
          comments.splice(i, 1);
        }
      }
      post.commentCount = Math.max(0, post.commentCount - deleteCount);
    },
    setCommentReaction: async (commentId: string, reaction: ReactionType | null) => {
      if (reaction !== null && !ALL_REACTIONS.includes(reaction)) {
        throw new ServiceError('invalid', 'Bu tepki desteklenmiyor.');
      }
      const comment = findComment(commentId);
      if (comment.myReaction !== reaction) {
        if (comment.myReaction) {
          const left = (comment.reactionCounts[comment.myReaction] ?? 0) - 1;
          if (left > 0) comment.reactionCounts[comment.myReaction] = left;
          else delete comment.reactionCounts[comment.myReaction];
        }
        if (reaction) comment.reactionCounts[reaction] = (comment.reactionCounts[reaction] ?? 0) + 1;
        comment.myReaction = reaction;
      }
      return copyComment(comment);
    },
  };
}

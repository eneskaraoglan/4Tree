import { useCallback, useEffect, useState } from 'react';

import { useOptionalAuth } from '@/features/auth/AuthProvider';
import { useServices } from '@/services';
import type { FeedComment, ReactionType } from '@/types';

export type ReplyingTarget = {
  commentId: string;
  authorName: string;
};

export function usePostComments(postId: string) {
  const { feed: feedService } = useServices();
  const auth = useOptionalAuth();
  const session = auth?.session;
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ReplyingTarget | null>(null);

  const currentUserId = session?.user.id ?? 'user-elif';

  const reload = useCallback(() => {
    setStatus('loading');
    setError(null);
    feedService
      .getComments(postId)
      .then((data) => {
        setComments(data);
        setStatus('ready');
        setError(null);
      })
      .catch((err) => {
        setError(err);
        setStatus('error');
      });
  }, [feedService, postId]);

  useEffect(() => {
    let cancelled = false;
    feedService
      .getComments(postId)
      .then((data) => {
        if (!cancelled) {
          setComments(data);
          setStatus('ready');
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setStatus('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [feedService, postId]);

  const addComment = useCallback(
    async (body: string) => {
      const trimmed = body.trim();
      if (!trimmed || submitting) return false;
      try {
        setSubmitting(true);
        const parentId = replyingTo?.commentId ?? null;
        const created = await feedService.addComment(postId, trimmed, parentId);
        if (parentId) {
          setComments((prev) =>
            prev.map((c) =>
              c.id === parentId
                ? { ...c, replies: [...(c.replies ?? []), created] }
                : c,
            ),
          );
        } else {
          setComments((prev) => [...prev, created]);
        }
        setReplyingTo(null);
        return true;
      } catch (err) {
        setError(err);
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [feedService, postId, replyingTo, submitting],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      try {
        await feedService.deleteComment(commentId);
        setComments((prev) =>
          prev
            .filter((c) => c.id !== commentId)
            .map((c) => ({
              ...c,
              replies: c.replies ? c.replies.filter((r) => r.id !== commentId) : [],
            })),
        );
        return true;
      } catch (err) {
        setError(err);
        return false;
      }
    },
    [feedService],
  );

  const reactComment = useCallback(
    async (commentId: string, reaction: ReactionType | null) => {
      try {
        const updated = await feedService.setCommentReaction(commentId, reaction);
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === commentId) {
              return { ...c, myReaction: updated.myReaction, reactionCounts: updated.reactionCounts };
            }
            if (c.replies) {
              return {
                ...c,
                replies: c.replies.map((r) =>
                  r.id === commentId
                    ? { ...r, myReaction: updated.myReaction, reactionCounts: updated.reactionCounts }
                    : r,
                ),
              };
            }
            return c;
          }),
        );
      } catch (err) {
        setError(err);
      }
    },
    [feedService],
  );

  return {
    comments,
    status,
    error,
    submitting,
    replyingTo,
    setReplyingTo,
    clearReplyingTo: () => setReplyingTo(null),
    load: reload,
    addComment,
    deleteComment,
    reactComment,
    currentUserId,
    supportedReactions: feedService.supportedReactions,
  };
}

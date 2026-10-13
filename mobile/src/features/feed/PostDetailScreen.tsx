import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { confirmAction } from '@/features/profile/confirmAction';
import { trFeed } from '@/i18n';
import { useServices } from '@/services';
import { colors, radius, screenPadding, spacing, touch } from '@/theme';
import type { FeedPost, ReactionType } from '@/types';

import { CommentItem } from './CommentItem';
import { PostEditModal } from './PostEditModal';
import { PostItem } from './PostItem';
import { useFeedGoBack } from './useFeedGoBack';
import { useNow } from './useNow';
import { usePostComments } from './usePostComments';

type Props = {
  postId: string;
  now?: Date;
  onPressAuthor?: (userId: string) => void;
};

export function PostDetailScreen({ postId, now, onPressAuthor }: Props) {
  const { feed: feedService } = useServices();
  const goBack = useFeedGoBack();
  const { now: clock } = useNow(now, true);
  const { width } = useWindowDimensions();
  const routeWidth = Math.max(0, width - 2 * screenPadding);

  const [post, setPost] = useState<FeedPost | null>(null);
  const [postLoading, setPostLoading] = useState(true);
  const [postError, setPostError] = useState<unknown>(null);
  const [commentText, setCommentText] = useState('');

  const {
    comments,
    status: commentsStatus,
    submitting,
    replyingTo,
    setReplyingTo,
    clearReplyingTo,
    load: reloadComments,
    addComment,
    deleteComment,
    reactComment,
    currentUserId,
    supportedReactions,
  } = usePostComments(postId);

  useEffect(() => {
    let cancelled = false;
    feedService
      .getPost(postId)
      .then((data) => {
        if (!cancelled) {
          setPost(data);
          setPostLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setPostError(err);
          setPostLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [feedService, postId]);

  const handleReactPost = useCallback(
    async (_id: string, reaction: ReactionType | null) => {
      try {
        const updated = await feedService.setReaction(postId, reaction);
        setPost(updated);
      } catch {
        // Hata durumunda FeedService veya toast yönetebilir
      }
    },
    [feedService, postId],
  );

  const handleSubmit = async () => {
    const trimmed = commentText.trim();
    if (!trimmed || submitting) return;
    const ok = await addComment(trimmed);
    if (ok) {
      setCommentText('');
      if (post) {
        setPost({ ...post, commentCount: post.commentCount + 1 });
      }
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const ok = await deleteComment(commentId);
    if (ok && post) {
      setPost({ ...post, commentCount: Math.max(0, post.commentCount - 1) });
    }
  };

  const reloadPost = useCallback(() => {
    setPostLoading(true);
    setPostError(null);
    feedService
      .getPost(postId)
      .then((data) => {
        setPost(data);
        setPostLoading(false);
      })
      .catch((err) => {
        setPostError(err);
        setPostLoading(false);
      });
  }, [feedService, postId]);

  const [editModalVisible, setEditModalVisible] = useState(false);

  const handleEditPost = useCallback(() => {
    setEditModalVisible(true);
  }, []);

  const handleSaveEdit = useCallback(
    async (caption: string) => {
      const updated = await feedService.updatePost(postId, { caption });
      setPost(updated);
    },
    [feedService, postId],
  );

  const handleDeletePost = useCallback(() => {
    confirmAction({
      title: trFeed.detail.deletePostConfirmTitle,
      message: trFeed.detail.deletePostConfirmMessage,
      confirmLabel: trFeed.detail.deleteConfirmOk,
      cancelLabel: trFeed.detail.cancel,
      onConfirm: async () => {
        try {
          await feedService.deletePost(postId);
          goBack();
        } catch {
          Alert.alert(trFeed.detail.title, trFeed.detail.deletePostError);
        }
      },
    });
  }, [feedService, goBack, postId]);

  return (
    <Screen>
      <KeyboardAvoidingView
        testID="post-detail-screen"
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.navBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Geri"
            onPress={goBack}
            hitSlop={8}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <AppText variant="body" color="primary">
              ‹ Geri
            </AppText>
          </Pressable>
          <AppText variant="title2" accessibilityRole="header">
            {trFeed.detail.title}
          </AppText>
          <View style={styles.navPlaceholder} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {postLoading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : postError || !post ? (
            <View style={styles.centerBox}>
              <AppText variant="body" color="textSecondary">
                {trFeed.error.notFound}
              </AppText>
              <Pressable accessibilityRole="button" onPress={reloadPost} style={styles.retryBtn}>
                <AppText variant="title3" color="primary">
                  {trFeed.error.retry}
                </AppText>
              </Pressable>
            </View>
          ) : (
            <>
              <PostItem
                post={post}
                now={clock}
                width={routeWidth}
                supported={supportedReactions}
                onReact={handleReactPost}
                onPressAuthor={onPressAuthor}
                currentUserId={currentUserId}
                onEditPost={handleEditPost}
                onDeletePost={handleDeletePost}
              />

              <View style={styles.divider} />

              <View style={styles.commentsHeader}>
                <AppText variant="title2">
                  {trFeed.detail.commentsTitle}
                </AppText>
                {post.commentCount > 0 ? (
                  <AppText variant="secondary" color="textTertiary">
                    ({post.commentCount})
                  </AppText>
                ) : null}
              </View>

              {commentsStatus === 'loading' ? (
                <View style={styles.commentsLoading}>
                  <ActivityIndicator color={colors.primary} size="small" />
                  <AppText variant="small" color="textSecondary">
                    {trFeed.loading}
                  </AppText>
                </View>
              ) : commentsStatus === 'error' ? (
                <View style={styles.commentsError}>
                  <AppText variant="small" color="danger">
                    {trFeed.detail.deleteError}
                  </AppText>
                  <Pressable accessibilityRole="button" onPress={reloadComments}>
                    <AppText variant="small" color="primary">
                      {trFeed.error.retry}
                    </AppText>
                  </Pressable>
                </View>
              ) : comments.length === 0 ? (
                <View style={styles.noCommentsBox}>
                  <AppText variant="body" color="textSecondary">
                    {trFeed.detail.noComments}
                  </AppText>
                </View>
              ) : (
                <View style={styles.commentsList}>
                  {comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      now={clock}
                      currentUserId={currentUserId}
                      supported={supportedReactions}
                      onReact={reactComment}
                      onReply={(target) => setReplyingTo(target)}
                      onDelete={handleDeleteComment}
                      onPressAuthor={onPressAuthor}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          {replyingTo ? (
            <View style={styles.replyingBanner}>
              <AppText variant="small" color="textSecondary" style={styles.replyingText}>
                {trFeed.detail.replyingTo(replyingTo.authorName)}
              </AppText>
              <Pressable
                accessibilityRole="button"
                onPress={clearReplyingTo}
                hitSlop={6}
                style={styles.cancelReplyBtn}>
                <AppText variant="small" color="primary">
                  {trFeed.detail.cancelReply}
                </AppText>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.inputRow}>
            <TextInput
              testID="comment-input"
              value={commentText}
              onChangeText={setCommentText}
              placeholder={
                replyingTo
                  ? trFeed.detail.replyPlaceholder
                  : trFeed.detail.addCommentPlaceholder
              }
              placeholderTextColor={colors.textTertiary}
              style={styles.textInput}
              multiline
              maxLength={500}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={trFeed.detail.send}
              onPress={handleSubmit}
              disabled={submitting || !commentText.trim()}
              style={({ pressed }) => [
                styles.sendButton,
                (!commentText.trim() || submitting) && styles.sendButtonDisabled,
                pressed && styles.pressed,
              ]}>
              <AppText
                variant="title3"
                color={commentText.trim() && !submitting ? 'onPrimary' : 'textTertiary'}>
                {trFeed.detail.send}
              </AppText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {post ? (
        <PostEditModal
          visible={editModalVisible}
          initialCaption={post.caption ?? ''}
          onSave={handleSaveEdit}
          onClose={() => setEditModalVisible(false)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    minHeight: touch.min,
  },
  backButton: {
    minHeight: touch.min,
    minWidth: touch.min,
    justifyContent: 'center',
  },
  navPlaceholder: {
    minWidth: touch.min,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.huge,
    gap: spacing.md,
  },
  centerBox: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  retryBtn: {
    minHeight: touch.min,
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.sm,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  commentsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  commentsError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  noCommentsBox: {
    paddingVertical: spacing.lg,
  },
  commentsList: {
    gap: spacing.md,
  },
  inputContainer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  replyingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  replyingText: {
    flex: 1,
  },
  cancelReplyBtn: {
    paddingHorizontal: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surface2,
    color: colors.text,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.surface2,
  },
  pressed: {
    opacity: 0.7,
  },
});

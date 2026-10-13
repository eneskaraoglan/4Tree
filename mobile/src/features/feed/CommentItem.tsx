import { memo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { ReactionBar } from '@/components/reactions';
import { trFeed } from '@/i18n';
import { colors, spacing } from '@/theme';
import type { FeedComment, ReactionType } from '@/types';

import { formatPostTime } from './format';
import { PostAvatar } from './PostAvatar';

type Props = {
  comment: FeedComment;
  now: Date;
  currentUserId: string;
  supported: readonly ReactionType[];
  onReact: (commentId: string, reaction: ReactionType | null) => void;
  onReply?: (target: { commentId: string; authorName: string }) => void;
  onDelete: (commentId: string) => void;
  onPressAuthor?: (userId: string) => void;
  isReply?: boolean;
};

function CommentItemBase({
  comment,
  now,
  currentUserId,
  supported,
  onReact,
  onReply,
  onDelete,
  onPressAuthor,
  isReply = false,
}: Props) {
  const [showReplies, setShowReplies] = useState(false);
  const isMine = comment.author.id === currentUserId;
  const replies = comment.replies ?? [];
  const avatarSize = isReply ? 28 : 34;

  const confirmDelete = () => {
    Alert.alert(
      trFeed.detail.deleteConfirmTitle,
      trFeed.detail.deleteConfirmMessage,
      [
        { text: trFeed.detail.deleteConfirmCancel, style: 'cancel' },
        {
          text: trFeed.detail.deleteConfirmOk,
          style: 'destructive',
          onPress: () => onDelete(comment.id),
        },
      ],
    );
  };

  return (
    <View style={[styles.container, isReply && styles.replyContainer]} testID={`comment-${comment.id}`}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={comment.author.name}
          onPress={() => onPressAuthor?.(comment.author.id)}
          disabled={!onPressAuthor}
          style={styles.authorButton}>
          <PostAvatar name={comment.author.name} initial={comment.author.avatarInitial} size={avatarSize} />
          <View style={styles.who}>
            <AppText variant="title3" style={isReply ? styles.replyAuthorName : undefined}>
              {comment.author.name}
            </AppText>
            <AppText variant="small" color="textTertiary">
              {formatPostTime(comment.createdAt, now)}
            </AppText>
          </View>
        </Pressable>

        {isMine ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={trFeed.detail.deleteComment}
            onPress={confirmDelete}
            style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
            <AppText variant="small" color="danger">
              {trFeed.detail.deleteComment}
            </AppText>
          </Pressable>
        ) : null}
      </View>

      <AppText variant="body" style={styles.body}>
        {comment.body}
      </AppText>

      <View style={styles.actions}>
        <View style={styles.reactionWrap}>
          <ReactionBar
            counts={comment.reactionCounts}
            mine={comment.myReaction}
            supported={supported}
            onChange={(reaction) => onReact(comment.id, reaction)}
            testID={`comment-reactions-${comment.id}`}
          />
        </View>

        {!isReply && onReply ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => onReply({ commentId: comment.id, authorName: comment.author.name })}
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
            <AppText variant="small" color="textSecondary">
              {trFeed.detail.reply}
            </AppText>
          </Pressable>
        ) : null}
      </View>

      {!isReply && replies.length > 0 ? (
        <View style={styles.repliesSection}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowReplies((prev) => !prev)}
            style={({ pressed }) => [styles.toggleRepliesButton, pressed && styles.pressed]}>
            <AppText variant="small" color="primary">
              {showReplies ? trFeed.detail.hideReplies : trFeed.detail.showReplies(replies.length)}
            </AppText>
          </Pressable>

          {showReplies ? (
            <View style={styles.repliesList}>
              {replies.map((reply) => (
                <CommentItemBase
                  key={reply.id}
                  comment={reply}
                  now={now}
                  currentUserId={currentUserId}
                  supported={supported}
                  onReact={onReact}
                  onDelete={onDelete}
                  onPressAuthor={onPressAuthor}
                  isReply
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export const CommentItem = memo(CommentItemBase);

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  replyContainer: {
    paddingLeft: spacing.lg,
    paddingVertical: spacing.xs,
    borderLeftWidth: 2,
    borderLeftColor: colors.surface2,
    marginLeft: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  authorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  who: {
    flex: 1,
  },
  replyAuthorName: {
    fontSize: 14,
  },
  deleteButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  body: {
    color: colors.text,
    lineHeight: 20,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  reactionWrap: {
    flex: 1,
  },
  actionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  repliesSection: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  toggleRepliesButton: {
    paddingVertical: spacing.xs,
  },
  repliesList: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
});

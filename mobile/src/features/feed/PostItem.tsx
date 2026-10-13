import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { ReactionBar } from '@/components/reactions';
import { RouteLine } from '@/components/RouteLine';
import { trFeed } from '@/i18n';
import { colors, spacing, touch } from '@/theme';
import type { FeedPost, ReactionType } from '@/types';

import { formatDuration, formatKm, formatPostTime } from './format';
import { ROUTE_HEIGHT, ROUTE_STROKE } from './layout';
import { PostAvatar } from './PostAvatar';
import { RouteContours } from './RouteContours';
import { TreeGlyphs } from './TreeGlyphs';

type Props = {
  post: FeedPost;
  now: Date;
  /** Rota çiziminin genişliği: ekran genişliği - 2 x yan boşluk. */
  width: number;
  /** Servisin desteklediği tepki türleri (seçicide yalnız bunlar görünür). */
  supported: readonly ReactionType[];
  /** null: tepkiyi geri al. */
  onReact: (postId: string, reaction: ReactionType | null) => void;
  /** Yazar profiline gitme (T-018c). */
  onPressAuthor?: (userId: string) => void;
  /** Yorumlar / gönderi detayına gitme (T-018a). */
  onPressComments?: (postId: string) => void;
  /** Giriş yapan kullanıcının kimliği (kendi gönderisi kontrolü için). */
  currentUserId?: string;
  /** Kendi gönderisini düzenleme (T-018f). */
  onEditPost?: (post: FeedPost) => void;
  /** Kendi gönderisini silme (T-018f). */
  onDeletePost?: (postId: string) => void;
};

/** Kartsız tek gönderi: arazi defterinde bir giriş gibi, boşlukla ayrılır. */
function PostItemBase({
  post,
  now,
  width,
  supported,
  onReact,
  onPressAuthor,
  onPressComments,
  currentUserId,
  onEditPost,
  onDeletePost,
}: Props) {
  const { author, activity } = post;
  // Rota yoksa rota alanı hiç gösterilmez (sahte rota uydurulmaz).
  const route = activity.route && activity.route.length >= 2 ? activity.route : null;
  const km = formatKm(activity.distanceKm);
  const activityLabel = activity.type === 'walk' ? trFeed.activity.walk : trFeed.activity.run;
  const isOwnPost = Boolean(currentUserId && author.id === currentUserId);
  const hasAuthorActions = isOwnPost && Boolean(onEditPost || onDeletePost);

  return (
    <View style={styles.post} testID={`post-${post.id}`}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel={`${author.name} profili`}
          onPress={onPressAuthor ? () => onPressAuthor(author.id) : undefined}
          disabled={!onPressAuthor}
          style={styles.authorButton}>
          <PostAvatar name={author.name} initial={author.avatarInitial} />
          <View style={styles.who}>
            <AppText variant="title3" numberOfLines={1}>
              {author.name}
            </AppText>
            <AppText variant="small" color="textTertiary">
              {formatPostTime(post.createdAt, now)}
            </AppText>
          </View>
        </Pressable>

        {hasAuthorActions ? (
          <View style={styles.authorActions}>
            {onEditPost ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={trFeed.detail.editPost}
                onPress={() => onEditPost(post)}
                hitSlop={8}
                testID={`edit-post-btn-${post.id}`}
                style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}>
                <AppText variant="small" color="primary">
                  {trFeed.detail.editPost}
                </AppText>
              </Pressable>
            ) : null}
            {onDeletePost ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={trFeed.detail.deletePost}
                onPress={() => onDeletePost(post.id)}
                hitSlop={8}
                testID={`delete-post-btn-${post.id}`}
                style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}>
                <AppText variant="small" color="danger">
                  {trFeed.detail.deletePost}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {post.caption ? (
        <AppText variant="body" style={styles.caption}>
          {post.caption}
        </AppText>
      ) : null}

      {route ? (
        <View style={[styles.route, { width, height: ROUTE_HEIGHT }]}>
          <RouteContours postId={post.id} width={width} height={ROUTE_HEIGHT} />
          <RouteLine
            points={route}
            width={width}
            height={ROUTE_HEIGHT}
            strokeWidth={ROUTE_STROKE}
            color={colors.textSecondary}
            accessibilityLabel={trFeed.routeA11y(km)}
          />
        </View>
      ) : null}

      <View style={styles.summary}>
        <View style={styles.summaryText}>
          <AppText variant="title2">{trFeed.distance(km)}</AppText>
          <AppText variant="secondary" color="textSecondary">
            {trFeed.meta(activityLabel, formatDuration(activity.durationSec), activity.place)}
          </AppText>
        </View>
        <TreeGlyphs count={post.treesEarned} />
      </View>

      <View style={styles.reactions}>
        <View style={styles.bar}>
          <ReactionBar
            counts={post.reactionCounts}
            mine={post.myReaction}
            supported={supported}
            onChange={(reaction) => onReact(post.id, reaction)}
            testID={`reactions-${post.id}`}
          />
        </View>
        {post.commentCount > 0 ? (
          <Pressable
            accessibilityLabel={trFeed.comments(post.commentCount)}
            onPress={() => onPressComments?.(post.id)}
            disabled={!onPressComments}
            testID={`comments-button-${post.id}`}>
            <AppText variant="small" color="textTertiary">
              {trFeed.comments(post.commentCount)}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Aynı gönderi için props değişmedikçe yeniden çizilmez (tepki, saat ya da genişlik değişince çizilir). */
export const PostItem = memo(PostItemBase);

const styles = StyleSheet.create({
  post: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  authorButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  who: { flex: 1 },
  authorActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actionBtn: { minHeight: touch.min, justifyContent: 'center', paddingHorizontal: spacing.xs },
  pressed: { opacity: 0.7 },
  caption: { marginTop: spacing.xs },
  route: { marginVertical: spacing.xs },
  summary: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.lg },
  summaryText: { flex: 1 },
  reactions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: -spacing.xs },
  bar: { flex: 1 },
});

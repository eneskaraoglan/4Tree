import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { RouteLine } from '@/components/RouteLine';
import { trFeed } from '@/i18n';
import { colors, spacing } from '@/theme';
import type { FeedPost } from '@/types';

import { formatDuration, formatKm, formatPostTime } from './format';
import { ROUTE_HEIGHT, ROUTE_STROKE } from './layout';
import { PostAvatar } from './PostAvatar';
import { ReactionButton, type ReactionKind } from './ReactionButton';
import { RouteContours } from './RouteContours';
import { TreeGlyphs } from './TreeGlyphs';

type Props = {
  post: FeedPost;
  now: Date;
  /** Rota çiziminin genişliği: ekran genişliği - 2 x yan boşluk. */
  width: number;
  onReact: (postId: string, kind: ReactionKind) => void;
};

/** Kartsız tek gönderi: arazi defterinde bir giriş gibi, boşlukla ayrılır. */
function PostItemBase({ post, now, width, onReact }: Props) {
  const { author, activity } = post;
  // Rota yoksa rota alanı hiç gösterilmez (sahte rota uydurulmaz).
  const route = activity.route && activity.route.length >= 2 ? activity.route : null;
  const km = formatKm(activity.distanceKm);
  const activityLabel = activity.type === 'walk' ? trFeed.activity.walk : trFeed.activity.run;

  return (
    <View style={styles.post} testID={`post-${post.id}`}>
      <View style={styles.header}>
        <PostAvatar name={author.name} initial={author.avatarInitial} />
        <View style={styles.who}>
          <AppText variant="title3" numberOfLines={1}>
            {author.name}
          </AppText>
          <AppText variant="small" color="textTertiary">
            {formatPostTime(post.createdAt, now)}
          </AppText>
        </View>
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
        <ReactionButton
          kind="clap"
          active={post.myReactions.clapped}
          count={post.clapCount}
          onPress={() => onReact(post.id, 'clap')}
        />
        <ReactionButton
          kind="water"
          active={post.myReactions.watered}
          count={post.waterCount}
          onPress={() => onReact(post.id, 'water')}
        />
        <View style={styles.spacer} />
        {post.commentCount > 0 ? (
          <AppText variant="small" color="textTertiary">
            {trFeed.comments(post.commentCount)}
          </AppText>
        ) : null}
      </View>

    </View>
  );
}

/** Aynı gönderi için props değişmedikçe yeniden çizilmez (tepki, saat ya da genişlik değişince çizilir). */
export const PostItem = memo(PostItemBase);

const styles = StyleSheet.create({
  post: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  who: { flex: 1 },
  caption: { marginTop: spacing.xs },
  route: { marginVertical: spacing.xs },
  summary: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.lg },
  summaryText: { flex: 1 },
  reactions: { flexDirection: 'row', alignItems: 'center', marginTop: -spacing.xs },
  spacer: { flex: 1 },
});

import { StyleSheet, View } from 'react-native';

import { trFeed } from '@/i18n';
import { colors, radius, spacing } from '@/theme';

import { AVATAR_SIZE, ROUTE_HEIGHT, SKELETON } from './layout';

function Bar({ width, height }: { width: number | `${number}%`; height: number }) {
  return <View style={[styles.bar, { width, height }]} />;
}

/** Yüklenirken gönderi yerleşimini taklit eden sade iskelet satırları. */
export function FeedSkeleton() {
  return (
    <View
      accessible
      accessibilityLabel={trFeed.loading}
      accessibilityState={{ busy: true }}
      style={styles.list}
      testID="feed-skeleton">
      {Array.from({ length: SKELETON.posts }, (_, i) => (
        <View key={i} style={styles.post}>
          <View style={styles.header}>
            <View style={styles.avatar} />
            <View style={styles.who}>
              <Bar width={SKELETON.nameWidth} height={SKELETON.nameHeight} />
              <Bar width={SKELETON.timeWidth} height={SKELETON.timeHeight} />
            </View>
          </View>
          <Bar width={SKELETON.captionWidth} height={SKELETON.captionHeight} />
          <Bar width="100%" height={ROUTE_HEIGHT} />
          <Bar width={SKELETON.summaryWidth} height={SKELETON.summaryHeight} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.huge },
  post: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: radius.pill, backgroundColor: colors.surface },
  who: { gap: spacing.xs },
  bar: { backgroundColor: colors.surface, borderRadius: radius.sm },
});

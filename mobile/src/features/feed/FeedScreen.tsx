import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { trFeed } from '@/i18n';
import { ServiceError, type FeedScope } from '@/services';
import { colors, radius, screenPadding, spacing, touch } from '@/theme';
import type { FeedPost } from '@/types';

import { FeedSkeleton } from './FeedSkeleton';
import { FeedTabs } from './FeedTabs';
import { PostItem } from './PostItem';
import { useFeed } from './useFeed';
import { useNow } from './useNow';

type Props = {
  /** Göreli zamanlar için "şimdi"; testlerde sabitlenir. Verilmezse dakikada bir ve odaklanınca tazelenir. */
  now?: Date;
  /** Sekme odakta mı (route useIsFocused ile verir). Odağa dönünce zamanlar tazelenir. */
  focused?: boolean;
};

function errorMessage(error: unknown): string {
  if (error instanceof ServiceError) {
    if (error.code === 'network') return trFeed.error.network;
    if (error.code === 'not_found') return trFeed.error.notFound;
    if (error.code === 'invalid') return trFeed.error.invalid;
  }
  return trFeed.error.generic;
}

/** Feed sekmesi: üstte Arkadaşlar | Herkes, altında kartsız, editoryal gönderi akışı. */
export function FeedScreen({ now, focused = true }: Props) {
  const [scope, setScope] = useState<FeedScope>('friends');
  const feed = useFeed(scope);
  const { now: clock, refreshNow } = useNow(now, focused);
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<FeedPost>>(null);

  const routeWidth = Math.max(0, width - 2 * screenPadding);
  const { react, refresh } = feed;

  useEffect(() => {
    if (focused) refreshNow();
  }, [focused, refreshNow]);

  const changeScope = (next: FeedScope) => {
    setScope(next);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const onRefresh = () => {
    refreshNow();
    void refresh();
  };

  const renderItem = useCallback(
    ({ item }: { item: FeedPost }) => <PostItem post={item} now={clock} width={routeWidth} onReact={react} />,
    [clock, routeWidth, react],
  );

  const empty =
    feed.status === 'loading' ? (
      <FeedSkeleton />
    ) : feed.status === 'error' ? (
      <View style={styles.message}>
        <AppText variant="body" color="textSecondary">
          {errorMessage(feed.error)}
        </AppText>
        <Pressable
          accessibilityRole="button"
          onPress={feed.retry}
          style={({ pressed }) => [styles.retry, pressed && styles.pressed]}>
          <AppText variant="title3" color="primary">
            {trFeed.error.retry}
          </AppText>
        </Pressable>
      </View>
    ) : (
      <View style={styles.message}>
        <AppText variant="body" color="textSecondary">
          {scope === 'friends' ? trFeed.empty.friends : trFeed.empty.everyone}
        </AppText>
      </View>
    );

  return (
    <Screen>
      <FeedTabs selected={scope} onChange={changeScope} />
      <FlatList
        ref={listRef}
        testID="feed-list"
        data={feed.status === 'ready' ? feed.posts : []}
        keyExtractor={(post) => post.id}
        renderItem={renderItem}
        extraData={clock.getTime()}
        ItemSeparatorComponent={Gap}
        ListEmptyComponent={empty}
        refreshControl={
          <RefreshControl
            refreshing={feed.refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        initialNumToRender={3}
        windowSize={7}
      />
      {feed.notice ? (
        <View pointerEvents="none" style={styles.toastLayer}>
          <View style={styles.toast}>
            <AppText variant="secondary" color="danger" accessibilityRole="alert" accessibilityLiveRegion="polite">
              {feed.notice.text}
            </AppText>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

function Gap() {
  return <View style={styles.gap} />;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingTop: spacing.lg, paddingBottom: spacing.huge },
  gap: { height: spacing.huge },
  message: { gap: spacing.sm, paddingTop: spacing.xxl, alignItems: 'flex-start' },
  retry: { minHeight: touch.min, justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  // Bildirim listenin üstüne biner; akışı aşağı itmez.
  toastLayer: { position: 'absolute', left: 0, right: 0, bottom: spacing.lg },
  toast: { backgroundColor: colors.surface, borderRadius: radius.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
});

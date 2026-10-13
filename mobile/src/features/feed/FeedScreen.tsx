import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { useOptionalAuth } from '@/features/auth/AuthProvider';
import { confirmAction } from '@/features/profile/confirmAction';
import { trFeed } from '@/i18n';
import { ServiceError, type FeedScope } from '@/services';
import { colors, radius, screenPadding, spacing, touch } from '@/theme';
import type { FeedPost } from '@/types';

import { FeedSkeleton } from './FeedSkeleton';
import { FeedTabs } from './FeedTabs';
import { PostEditModal } from './PostEditModal';
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
  const router = useRouter();
  const [scope, setScope] = useState<FeedScope>('friends');
  const feed = useFeed(scope);
  const { now: clock, refreshNow } = useNow(now, focused);
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<FeedPost>>(null);

  const routeWidth = Math.max(0, width - 2 * screenPadding);
  const { react, refresh, supportedReactions } = feed;

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

  const auth = useOptionalAuth();
  const currentUserId = auth?.session?.user.id ?? 'user-elif';
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);

  const handlePressComments = useCallback(
    (postId: string) => {
      router.push({ pathname: '/post-detail', params: { postId } } as any);
    },
    [router],
  );

  const handlePressAuthor = useCallback(
    (userId: string) => {
      router.push({ pathname: '/user-profile', params: { userId } } as any);
    },
    [router],
  );

  const handleEditPost = useCallback((post: FeedPost) => {
    setEditingPost(post);
  }, []);

  const handleSaveEdit = useCallback(
    async (caption: string) => {
      if (!editingPost) return;
      await feed.editFeedPost(editingPost.id, { caption });
      setEditingPost(null);
    },
    [editingPost, feed],
  );

  const handleDeletePost = useCallback(
    (postId: string) => {
      confirmAction({
        title: trFeed.detail.deletePostConfirmTitle,
        message: trFeed.detail.deletePostConfirmMessage,
        confirmLabel: trFeed.detail.deleteConfirmOk,
        cancelLabel: trFeed.detail.cancel,
        onConfirm: async () => {
          try {
            await feed.deleteFeedPost(postId);
          } catch {
            Alert.alert(trFeed.detail.title, trFeed.detail.deletePostError);
          }
        },
      });
    },
    [feed],
  );

  const renderItem = useCallback(
    ({ item }: { item: FeedPost }) => (
      <PostItem
        post={item}
        now={clock}
        width={routeWidth}
        supported={supportedReactions}
        onReact={react}
        onPressAuthor={handlePressAuthor}
        onPressComments={handlePressComments}
        currentUserId={currentUserId}
        onEditPost={handleEditPost}
        onDeletePost={handleDeletePost}
      />
    ),
    [
      clock,
      routeWidth,
      supportedReactions,
      react,
      handlePressAuthor,
      handlePressComments,
      currentUserId,
      handleEditPost,
      handleDeletePost,
    ],
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

  const renderFooter = () => {
    if (feed.loadingMore) {
      return (
        <View style={styles.footerLoading} testID="feed-loading-more">
          <ActivityIndicator color={colors.primary} />
          <AppText variant="small" color="textSecondary">
            {trFeed.pagination.loadingMore}
          </AppText>
        </View>
      );
    }
    if (!feed.hasMore && feed.posts.length > 0) {
      return (
        <View style={styles.footerEnd} testID="feed-end-of-posts">
          <AppText variant="small" color="textTertiary">
            {trFeed.pagination.endOfFeed}
          </AppText>
        </View>
      );
    }
    return null;
  };

  return (
    <Screen>
      <View style={styles.topBar}>
        <FeedTabs selected={scope} onChange={changeScope} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={trFeed.composer.title}
          onPress={() => router.push('/post-composer' as any)}
          testID="feed-composer-button"
          hitSlop={8}
          style={({ pressed }) => [styles.composerBtn, pressed && styles.pressed]}>
          <AppText variant="title3" color="primary">
            + Paylaş
          </AppText>
        </Pressable>
      </View>
      <FlatList
        ref={listRef}
        testID="feed-list"
        data={feed.status === 'ready' ? feed.posts : []}
        keyExtractor={(post) => post.id}
        renderItem={renderItem}
        extraData={clock.getTime()}
        ItemSeparatorComponent={Gap}
        ListEmptyComponent={empty}
        ListFooterComponent={renderFooter}
        onEndReached={feed.loadMore}
        onEndReachedThreshold={0.4}
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

      <PostEditModal
        visible={Boolean(editingPost)}
        initialCaption={editingPost?.caption ?? ''}
        onSave={handleSaveEdit}
        onClose={() => setEditingPost(null)}
      />
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
  footerLoading: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerEnd: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  composerBtn: {
    minHeight: touch.min,
    minWidth: touch.min,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
});

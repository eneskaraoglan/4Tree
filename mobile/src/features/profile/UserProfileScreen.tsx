import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { useOptionalAuth } from '@/features/auth/AuthProvider';
import { PostItem } from '@/features/feed/PostItem';
import { useFeedGoBack } from '@/features/feed/useFeedGoBack';
import { useNow } from '@/features/feed/useNow';
import { fill, profileTr } from '@/i18n';
import { useServices } from '@/services';
import { colors, radius, spacing, touch } from '@/theme';
import type { FeedPost, FriendshipStatus, ReactionType, UserProfile } from '@/types';

import { formatSince } from './format';
import { Karne } from './Karne';
import { OrganicAvatar } from './OrganicAvatar';

type Props = {
  userId: string;
  onBack?: () => void;
  onPressPostComments?: (postId: string) => void;
};

export function UserProfileScreen({ userId, onBack, onPressPostComments }: Props) {
  const { profile: profileService, feed: feedService } = useServices();
  const auth = useOptionalAuth();
  const currentUserId = auth?.session?.user.id ?? 'user-elif';
  const defaultGoBack = useFeedGoBack();
  const goBack = onBack ?? defaultGoBack;
  const { now } = useNow();
  const { width: windowWidth } = useWindowDimensions();
  const postWidth = Math.max(0, windowWidth - spacing.md * 2);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<unknown>(null);

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  const loadProfile = useCallback(() => {
    let active = true;
    profileService
      .getUserProfile(userId)
      .then((data) => {
        if (!active) return;
        setUserProfile(data);
        setProfileLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setProfileError(err);
        setProfileLoading(false);
      });
    return () => {
      active = false;
    };
  }, [profileService, userId]);

  useEffect(() => {
    return loadProfile();
  }, [loadProfile]);

  const reload = useCallback(() => {
    setProfileLoading(true);
    setProfileError(null);
    profileService
      .getUserProfile(userId)
      .then((data) => {
        setUserProfile(data);
        setProfileLoading(false);
      })
      .catch((err) => {
        setProfileError(err);
        setProfileLoading(false);
      });
  }, [profileService, userId]);

  // Profil yüklendikten sonra (eğer gizli değilse) gönderileri yükle
  const isSelf = userId === currentUserId;
  const isFriends = userProfile?.friendshipStatus === 'friends';
  const isPrivate = userProfile?.visibility === 'private';
  const isFriendsOnly = userProfile?.visibility === 'friends';
  const isLocked = !isSelf && (isPrivate || (isFriendsOnly && !isFriends));

  useEffect(() => {
    if (!userProfile || isLocked) {
      return;
    }
    let active = true;
    feedService
      .getPosts('everyone')
      .then((all) => {
        if (!active) return;
        setPosts(all.filter((p) => p.author.id === userId));
        setPostsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setPostsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [feedService, isLocked, userId, userProfile]);

  const handleFriendshipChange = useCallback(
    async (nextStatus: FriendshipStatus) => {
      if (actionLoading || !userProfile) return;
      try {
        setActionLoading(true);
        const updated = await profileService.setFriendshipStatus(userId, nextStatus);
        setUserProfile(updated);
      } catch {
        Alert.alert(profileTr.userProfile.title, profileTr.userProfile.error);
      } finally {
        setActionLoading(false);
      }
    },
    [actionLoading, profileService, userId, userProfile],
  );

  const handlePressFriendship = () => {
    if (!userProfile) return;
    const { friendshipStatus, name } = userProfile;
    if (friendshipStatus === 'none') {
      void handleFriendshipChange('pending');
    } else if (friendshipStatus === 'pending') {
      void handleFriendshipChange('none');
    } else if (friendshipStatus === 'incoming') {
      void handleFriendshipChange('friends');
    } else if (friendshipStatus === 'friends') {
      Alert.alert(
        profileTr.userProfile.friendship.confirmRemoveTitle,
        fill(profileTr.userProfile.friendship.confirmRemoveMessage, { name }),
        [
          { text: profileTr.userProfile.friendship.confirmRemoveCancel, style: 'cancel' },
          {
            text: profileTr.userProfile.friendship.confirmRemoveOk,
            style: 'destructive',
            onPress: () => void handleFriendshipChange('none'),
          },
        ],
      );
    }
  };

  const handleReactPost = useCallback(
    async (postId: string, reaction: ReactionType | null) => {
      try {
        const updated = await feedService.setReaction(postId, reaction);
        setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
      } catch {
        // FeedService hata yönetimi
      }
    },
    [feedService],
  );

  return (
    <Screen>
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
          {profileTr.userProfile.title}
        </AppText>
        <View style={styles.navPlaceholder} />
      </View>

      <ScrollView
        testID="user-profile-scroll"
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {profileLoading ? (
          <View style={styles.centerBox} testID="user-profile-loading">
            <ActivityIndicator color={colors.primary} />
            <AppText variant="secondary" color="textSecondary">
              {profileTr.loading}
            </AppText>
          </View>
        ) : profileError || !userProfile ? (
          <View style={styles.centerBox} testID="user-profile-error">
            <AppText variant="body" color="textSecondary">
              {profileTr.userProfile.userNotFound}
            </AppText>
            <Pressable accessibilityRole="button" onPress={reload} style={styles.retryBtn}>
              <AppText variant="title3" color="primary">
                {profileTr.retry}
              </AppText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.profileContent} testID="user-profile-content">
            {/* Üst Kimlik Kartı */}
            <View style={styles.headerCard}>
              <OrganicAvatar
                name={userProfile.name}
                initial={userProfile.avatarInitial}
                size={80}
              />
              <View style={styles.headerInfo}>
                <AppText variant="title1" testID="user-profile-name">
                  {userProfile.name}
                </AppText>
                <View style={styles.badgesRow}>
                  <View style={styles.levelBadge}>
                    <AppText variant="small" color="primary">
                      {profileTr.levels[userProfile.level]}
                    </AppText>
                  </View>
                </View>
                {userProfile.joinedAt ? (
                  <AppText variant="small" color="textTertiary">
                    {formatSince(userProfile.joinedAt)}
                  </AppText>
                ) : null}
              </View>
            </View>

            {/* Arkadaşlık Durumu Düğmesi */}
            {!isSelf && (
              <View style={styles.actionContainer}>
                {userProfile.friendshipStatus === 'incoming' ? (
                  <View style={styles.incomingRow}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void handleFriendshipChange('friends')}
                      disabled={actionLoading}
                      style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                      <AppText variant="title3" color="onPrimary">
                        {profileTr.userProfile.friendship.accept}
                      </AppText>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void handleFriendshipChange('none')}
                      disabled={actionLoading}
                      style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                      <AppText variant="title3" color="textSecondary">
                        {profileTr.userProfile.friendship.reject}
                      </AppText>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    testID="friendship-status-btn"
                    onPress={handlePressFriendship}
                    disabled={actionLoading}
                    style={({ pressed }) => [
                      userProfile.friendshipStatus === 'none'
                        ? styles.primaryButton
                        : styles.secondaryButton,
                      pressed && styles.pressed,
                    ]}>
                    <AppText
                      variant="title3"
                      color={
                        userProfile.friendshipStatus === 'none' ? 'onPrimary' : 'primary'
                      }>
                      {userProfile.friendshipStatus === 'none'
                        ? profileTr.userProfile.friendship.add
                        : userProfile.friendshipStatus === 'pending'
                          ? profileTr.userProfile.friendship.cancelRequest
                          : profileTr.userProfile.friendship.friends}
                    </AppText>
                  </Pressable>
                )}
              </View>
            )}

            {/* Kilitli Durum */}
            {isLocked ? (
              <View style={styles.lockedContainer} testID="profile-locked-box">
                <View style={styles.lockedBadge}>
                  <AppText variant="body" color="textSecondary">
                    {isPrivate
                      ? profileTr.userProfile.privateNotice
                      : profileTr.userProfile.friendsOnlyNotice}
                  </AppText>
                </View>
              </View>
            ) : (
              <>
                {/* Karne Özeti */}
                <View style={styles.karneBox}>
                  <Karne profile={userProfile} />
                </View>

                {/* Gönderiler */}
                <View style={styles.postsSection}>
                  <AppText variant="title2" style={styles.postsTitle}>
                    {profileTr.userProfile.postsTitle}
                  </AppText>
                  {postsLoading ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : posts.length === 0 ? (
                    <AppText variant="body" color="textTertiary">
                      {profileTr.userProfile.noPosts}
                    </AppText>
                  ) : (
                    <View style={styles.postsList}>
                      {posts.map((post) => (
                        <PostItem
                          key={post.id}
                          post={post}
                          now={now}
                          width={postWidth}
                          supported={feedService.supportedReactions}
                          onReact={handleReactPost}
                          onPressComments={onPressPostComments}
                        />
                      ))}
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  profileContent: {
    gap: spacing.xl,
    paddingTop: spacing.md,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  headerInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  levelBadge: {
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  actionContainer: {
    marginTop: spacing.xs,
  },
  incomingRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  secondaryButton: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.card,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  lockedContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  lockedBadge: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: radius.card,
    alignItems: 'center',
  },
  karneBox: {
    marginTop: spacing.md,
  },
  postsSection: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  postsTitle: {
    marginBottom: spacing.xs,
  },
  postsList: {
    gap: spacing.xl,
  },
  pressed: {
    opacity: 0.7,
  },
});

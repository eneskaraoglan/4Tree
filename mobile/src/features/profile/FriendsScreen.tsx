import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { useFeedGoBack } from '@/features/feed/useFeedGoBack';
import { fill, profileTr } from '@/i18n';
import { useServices } from '@/services';
import { colors, radius, spacing, touch } from '@/theme';
import type { FriendshipStatus, UserProfile } from '@/types';

import { OrganicAvatar } from './OrganicAvatar';

type TabKey = 'friends' | 'requests' | 'search';

type Props = {
  onBack?: () => void;
  onPressUser?: (userId: string) => void;
};

export function FriendsScreen({ onBack, onPressUser }: Props) {
  const { profile: profileService } = useServices();
  const defaultGoBack = useFeedGoBack();
  const goBack = onBack ?? defaultGoBack;

  const [activeTab, setActiveTab] = useState<TabKey>('friends');
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<{ incoming: UserProfile[]; outgoing: UserProfile[] }>({
    incoming: [],
    outgoing: [],
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const reloadData = useCallback(() => {
    let active = true;
    Promise.all([profileService.getFriends(), profileService.getFriendRequests()])
      .then(([fList, rList]) => {
        if (!active) return;
        setFriends(fList);
        setRequests(rList);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [profileService]);

  useEffect(() => {
    return reloadData();
  }, [reloadData]);

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      const trimmed = query.trim();
      if (!trimmed) {
        setSearchResults([]);
        return;
      }
      let active = true;
      setSearchLoading(true);
      profileService
        .searchUsers(trimmed)
        .then((results) => {
          if (!active) return;
          setSearchResults(results);
          setSearchLoading(false);
        })
        .catch(() => {
          if (!active) return;
          setSearchLoading(false);
        });
    },
    [profileService],
  );

  const handleRemoveFriend = (friend: UserProfile) => {
    Alert.alert(
      profileTr.friends.confirmRemoveTitle,
      fill(profileTr.friends.confirmRemoveMessage, { name: friend.name }),
      [
        { text: profileTr.friends.confirmRemoveCancel, style: 'cancel' },
        {
          text: profileTr.friends.confirmRemoveOk,
          style: 'destructive',
          onPress: async () => {
            if (actionLoading) return;
            try {
              setActionLoading(true);
              await profileService.setFriendshipStatus(friend.id, 'none');
              setFriends((prev) => prev.filter((f) => f.id !== friend.id));
            } catch {
              Alert.alert(profileTr.friends.title, profileTr.friends.error);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleRespondRequest = async (userId: string, accept: boolean) => {
    if (actionLoading) return;
    try {
      setActionLoading(true);
      await profileService.respondFriendRequest(userId, accept);
      setRequests((prev) => ({
        ...prev,
        incoming: prev.incoming.filter((r) => r.id !== userId),
      }));
      if (accept) {
        const accepted = requests.incoming.find((r) => r.id === userId);
        if (accepted) {
          setFriends((prev) => [...prev, { ...accepted, friendshipStatus: 'friends' }]);
        }
      }
    } catch {
      Alert.alert(profileTr.friends.title, profileTr.friends.error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOutgoing = async (userId: string) => {
    if (actionLoading) return;
    try {
      setActionLoading(true);
      await profileService.setFriendshipStatus(userId, 'none');
      setRequests((prev) => ({
        ...prev,
        outgoing: prev.outgoing.filter((r) => r.id !== userId),
      }));
    } catch {
      Alert.alert(profileTr.friends.title, profileTr.friends.error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSearchResultAction = async (user: UserProfile, targetStatus: FriendshipStatus) => {
    if (actionLoading) return;
    try {
      setActionLoading(true);
      const updated = await profileService.setFriendshipStatus(user.id, targetStatus);
      setSearchResults((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      if (targetStatus === 'friends') {
        setFriends((prev) => [...prev, updated]);
      } else if (targetStatus === 'none') {
        setFriends((prev) => prev.filter((f) => f.id !== user.id));
      }
    } catch {
      Alert.alert(profileTr.friends.title, profileTr.friends.error);
    } finally {
      setActionLoading(false);
    }
  };

  const incomingCount = requests.incoming.length;

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
          {profileTr.friends.title}
        </AppText>
        <View style={styles.navPlaceholder} />
      </View>

      {/* Sekme Seçici */}
      <View style={styles.tabsRow} accessibilityRole="tablist">
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'friends' }}
          onPress={() => setActiveTab('friends')}
          style={[styles.tabItem, activeTab === 'friends' && styles.tabItemActive]}>
          <AppText
            variant="title3"
            color={activeTab === 'friends' ? 'primary' : 'textSecondary'}>
            {profileTr.friends.tabs.friends}
          </AppText>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'requests' }}
          onPress={() => setActiveTab('requests')}
          style={[styles.tabItem, activeTab === 'requests' && styles.tabItemActive]}>
          <View style={styles.tabLabelRow}>
            <AppText
              variant="title3"
              color={activeTab === 'requests' ? 'primary' : 'textSecondary'}>
              {profileTr.friends.tabs.requests}
            </AppText>
            {incomingCount > 0 && (
              <View style={styles.badge} testID="incoming-requests-badge">
                <AppText variant="small" color="onPrimary">
                  {incomingCount}
                </AppText>
              </View>
            )}
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'search' }}
          onPress={() => setActiveTab('search')}
          style={[styles.tabItem, activeTab === 'search' && styles.tabItemActive]}>
          <AppText
            variant="title3"
            color={activeTab === 'search' ? 'primary' : 'textSecondary'}>
            {profileTr.friends.tabs.search}
          </AppText>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : activeTab === 'friends' ? (
          /* Arkadaşlarım Listesi */
          friends.length === 0 ? (
            <View style={styles.centerBox}>
              <AppText variant="body" color="textSecondary" style={styles.emptyText}>
                {profileTr.friends.noFriends}
              </AppText>
            </View>
          ) : (
            <View style={styles.list}>
              {friends.map((item) => (
                <View key={item.id} style={styles.userRow} testID={`friend-row-${item.id}`}>
                  <Pressable
                    style={styles.userInfo}
                    onPress={() => onPressUser?.(item.id)}>
                    <OrganicAvatar name={item.name} initial={item.avatarInitial} size={48} />
                    <View style={styles.userDetails}>
                      <AppText variant="title3">{item.name}</AppText>
                      <AppText variant="small" color="textTertiary">
                        {profileTr.levels[item.level]}
                      </AppText>
                    </View>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={profileTr.friends.remove}
                    onPress={() => handleRemoveFriend(item)}
                    style={({ pressed }) => [styles.smallSecondaryBtn, pressed && styles.pressed]}>
                    <AppText variant="small" color="textSecondary">
                      {profileTr.friends.remove}
                    </AppText>
                  </Pressable>
                </View>
              ))}
            </View>
          )
        ) : activeTab === 'requests' ? (
          /* İstekler Sekmesi */
          <View style={styles.requestsContainer}>
            {requests.incoming.length === 0 && requests.outgoing.length === 0 ? (
              <View style={styles.centerBox}>
                <AppText variant="body" color="textSecondary" style={styles.emptyText}>
                  {profileTr.friends.noRequests}
                </AppText>
              </View>
            ) : (
              <>
                {requests.incoming.length > 0 && (
                  <View style={styles.section}>
                    <AppText variant="title3" color="primary" style={styles.sectionTitle}>
                      {profileTr.friends.incomingRequests} ({requests.incoming.length})
                    </AppText>
                    <View style={styles.list}>
                      {requests.incoming.map((item) => (
                        <View key={item.id} style={styles.userRow} testID={`incoming-req-${item.id}`}>
                          <Pressable
                            style={styles.userInfo}
                            onPress={() => onPressUser?.(item.id)}>
                            <OrganicAvatar
                              name={item.name}
                              initial={item.avatarInitial}
                              size={48}
                            />
                            <View style={styles.userDetails}>
                              <AppText variant="title3">{item.name}</AppText>
                              <AppText variant="small" color="textTertiary">
                                {profileTr.levels[item.level]}
                              </AppText>
                            </View>
                          </Pressable>
                          <View style={styles.requestActions}>
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => void handleRespondRequest(item.id, true)}
                              style={({ pressed }) => [
                                styles.smallPrimaryBtn,
                                pressed && styles.pressed,
                              ]}>
                              <AppText variant="small" color="onPrimary">
                                {profileTr.friends.accept}
                              </AppText>
                            </Pressable>
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => void handleRespondRequest(item.id, false)}
                              style={({ pressed }) => [
                                styles.smallSecondaryBtn,
                                pressed && styles.pressed,
                              ]}>
                              <AppText variant="small" color="textSecondary">
                                {profileTr.friends.reject}
                              </AppText>
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {requests.outgoing.length > 0 && (
                  <View style={styles.section}>
                    <AppText variant="title3" color="textSecondary" style={styles.sectionTitle}>
                      {profileTr.friends.outgoingRequests} ({requests.outgoing.length})
                    </AppText>
                    <View style={styles.list}>
                      {requests.outgoing.map((item) => (
                        <View key={item.id} style={styles.userRow} testID={`outgoing-req-${item.id}`}>
                          <Pressable
                            style={styles.userInfo}
                            onPress={() => onPressUser?.(item.id)}>
                            <OrganicAvatar
                              name={item.name}
                              initial={item.avatarInitial}
                              size={48}
                            />
                            <View style={styles.userDetails}>
                              <AppText variant="title3">{item.name}</AppText>
                              <AppText variant="small" color="textTertiary">
                                {profileTr.levels[item.level]}
                              </AppText>
                            </View>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => void handleCancelOutgoing(item.id)}
                            style={({ pressed }) => [
                              styles.smallSecondaryBtn,
                              pressed && styles.pressed,
                            ]}>
                            <AppText variant="small" color="textSecondary">
                              {profileTr.friends.cancel}
                            </AppText>
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        ) : (
          /* Arama Sekmesi */
          <View style={styles.searchContainer}>
            <TextInput
              testID="friends-search-input"
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder={profileTr.friends.searchPlaceholder}
              placeholderTextColor={colors.textTertiary}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchLoading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : searchQuery.trim().length > 0 && searchResults.length === 0 ? (
              <View style={styles.centerBox}>
                <AppText variant="body" color="textSecondary" style={styles.emptyText}>
                  {profileTr.friends.noSearchResults}
                </AppText>
              </View>
            ) : (
              <View style={styles.list}>
                {searchResults.map((item) => (
                  <View key={item.id} style={styles.userRow} testID={`search-res-${item.id}`}>
                    <Pressable
                      style={styles.userInfo}
                      onPress={() => onPressUser?.(item.id)}>
                      <OrganicAvatar name={item.name} initial={item.avatarInitial} size={48} />
                      <View style={styles.userDetails}>
                        <AppText variant="title3">{item.name}</AppText>
                        <AppText variant="small" color="textTertiary">
                          {profileTr.levels[item.level]}
                        </AppText>
                      </View>
                    </Pressable>
                    {item.friendshipStatus === 'none' ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void handleSearchResultAction(item, 'pending')}
                        style={({ pressed }) => [
                          styles.smallPrimaryBtn,
                          pressed && styles.pressed,
                        ]}>
                        <AppText variant="small" color="onPrimary">
                          {profileTr.friends.add}
                        </AppText>
                      </Pressable>
                    ) : item.friendshipStatus === 'pending' ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void handleSearchResultAction(item, 'none')}
                        style={({ pressed }) => [
                          styles.smallSecondaryBtn,
                          pressed && styles.pressed,
                        ]}>
                        <AppText variant="small" color="textSecondary">
                          {profileTr.friends.cancel}
                        </AppText>
                      </Pressable>
                    ) : item.friendshipStatus === 'incoming' ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void handleSearchResultAction(item, 'friends')}
                        style={({ pressed }) => [
                          styles.smallPrimaryBtn,
                          pressed && styles.pressed,
                        ]}>
                        <AppText variant="small" color="onPrimary">
                          {profileTr.friends.accept}
                        </AppText>
                      </Pressable>
                    ) : (
                      <AppText variant="small" color="primary">
                        {profileTr.friends.alreadyFriends}
                      </AppText>
                    )}
                  </View>
                ))}
              </View>
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
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    marginBottom: spacing.md,
  },
  tabItem: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.primary,
  },
  tabLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
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
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  list: {
    gap: spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.card,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  userDetails: {
    flex: 1,
    gap: 2,
  },
  smallPrimaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallSecondaryBtn: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  requestsContainer: {
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    marginLeft: spacing.xs,
  },
  searchContainer: {
    gap: spacing.md,
  },
  searchInput: {
    backgroundColor: colors.surface2,
    color: colors.text,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    minHeight: 44,
  },
  pressed: {
    opacity: 0.7,
  },
});

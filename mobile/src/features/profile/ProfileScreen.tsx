import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { profileTr } from '@/i18n';
import { colors, radius, spacing, touch } from '@/theme';

import { Karne } from './Karne';
import { PrivacySection } from './PrivacySection';
import { ProfileFooter } from './ProfileFooter';
import { ProfileHeader } from './ProfileHeader';
import { useProfileData } from './useProfileData';

type Props = {
  /** Çıkış onaylanınca çağrılır. Oturum katmanı gelene dek bağlanmaz. */
  onSignOut?: () => void;
  /** Verilirse başlığın altında "Profili düzenle" satırı görünür. */
  onEditProfile?: () => void;
  /** Verilirse başlığın altında "Arkadaşlarım" satırı görünür. */
  onOpenFriends?: () => void;
};

/** Profil sekmesi: üstte kişisel karne, altında gizlilik ve çıkış. */
export function ProfileScreen({ onSignOut, onEditProfile, onOpenFriends }: Props) {
  const { state, retry } = useProfileData();

  if (state.status === 'loading') {
    return (
      <Screen>
        <AppText variant="secondary" color="textSecondary" accessibilityLiveRegion="polite">
          {profileTr.loading}
        </AppText>
      </Screen>
    );
  }

  if (state.status === 'error') {
    return (
      <Screen>
        <View style={styles.errorBox}>
          <AppText variant="body" accessibilityRole="alert">
            {profileTr.loadError}
          </AppText>
          <Pressable
            accessibilityRole="button"
            onPress={retry}
            style={({ pressed }) => [styles.retry, pressed && styles.pressed]}>
            <AppText variant="title3" color="onPrimary">
              {profileTr.retry}
            </AppText>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const { profile, settings, sinceLabel } = state.data;
  return (
    <Screen>
      <ScrollView
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        <ProfileHeader profile={profile} sinceLabel={sinceLabel} />
        <View style={styles.actionRows}>
          {onEditProfile ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={profileTr.edit.open}
              onPress={onEditProfile}
              style={({ pressed }) => [styles.editRow, pressed && styles.pressed]}>
              <AppText variant="body" color="primary">
                {profileTr.edit.open}
              </AppText>
              <MaterialCommunityIcons
                name="chevron-right"
                size={EDIT_ICON_SIZE}
                color={colors.primary}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            </Pressable>
          ) : null}
          {onOpenFriends ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={profileTr.friends.open}
              onPress={onOpenFriends}
              style={({ pressed }) => [styles.editRow, pressed && styles.pressed]}>
              <AppText variant="body" color="primary">
                {profileTr.friends.open}
              </AppText>
              <MaterialCommunityIcons
                name="chevron-right"
                size={EDIT_ICON_SIZE}
                color={colors.primary}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.karne}>
          <Karne profile={profile} />
        </View>
        <View style={styles.privacy}>
          <PrivacySection initial={settings} />
        </View>
        <View style={styles.footer}>
          <ProfileFooter onSignOut={onSignOut} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const EDIT_ICON_SIZE = 24;

const styles = StyleSheet.create({
  actionRows: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  editRow: {
    minHeight: touch.min,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    columnGap: spacing.xs,
  },
  content: { paddingBottom: spacing.huge },
  karne: { marginTop: spacing.huge },
  privacy: { marginTop: spacing.huge },
  footer: { marginTop: spacing.huge },
  errorBox: { rowGap: spacing.xl, alignItems: 'flex-start' },
  retry: {
    minHeight: touch.min,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.card,
    backgroundColor: colors.primary,
  },
  pressed: { opacity: 0.8 },
});

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
};

/** Profil sekmesi: üstte kişisel karne, altında gizlilik ve çıkış. */
export function ProfileScreen({ onSignOut }: Props) {
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

const styles = StyleSheet.create({
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

import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { profileTr } from '@/i18n';
import { colors, radius, spacing, touch } from '@/theme';

import { EditProfileForm } from './EditProfileForm';
import { useGoBack } from './useGoBack';
import { useProfileLoad } from './useProfileLoad';

/** Profili düzenle: önce güncel profil yüklenir, sonra form açılır. */
export function EditProfileScreen() {
  const { state, retry } = useProfileLoad();
  const goBack = useGoBack();

  if (state.status === 'ready') return <EditProfileForm profile={state.profile} />;

  return (
    <Screen>
      <Pressable
        accessibilityRole="button"
        onPress={goBack}
        hitSlop={8}
        style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
        <AppText variant="body" color="textSecondary">
          {profileTr.edit.cancel}
        </AppText>
      </Pressable>
      {state.status === 'loading' ? (
        <AppText variant="secondary" color="textSecondary" accessibilityLiveRegion="polite">
          {profileTr.edit.loading}
        </AppText>
      ) : (
        <View style={styles.errorBox}>
          <AppText variant="body" accessibilityRole="alert">
            {profileTr.edit.loadError}
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
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cancel: { minHeight: touch.min, minWidth: touch.min, alignSelf: 'flex-start', justifyContent: 'center' },
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

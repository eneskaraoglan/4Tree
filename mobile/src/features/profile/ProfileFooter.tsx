import Constants from 'expo-constants';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { fill, profileTr } from '@/i18n';
import { spacing, touch } from '@/theme';

import { confirmAction } from './confirmAction';

type Props = { onSignOut?: () => void };

/** Uygulama sürümü ve, yalnızca oturum katmanı `onSignOut` verirse, "Çıkış yap" satırı (onay sonrası çağrılır). */
export function ProfileFooter({ onSignOut }: Props) {
  const version = Constants.expoConfig?.version;

  const handleSignOut = () => {
    if (!onSignOut) return;
    confirmAction({
      title: profileTr.signOut.title,
      message: profileTr.signOut.message,
      confirmLabel: profileTr.signOut.action,
      cancelLabel: profileTr.signOut.cancel,
      onConfirm: onSignOut,
    });
  };

  return (
    <View>
      {onSignOut ? (
        <Pressable
          accessibilityRole="button"
          onPress={handleSignOut}
          style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}>
          <AppText variant="body" color="textSecondary">
            {profileTr.signOut.action}
          </AppText>
        </Pressable>
      ) : null}
      {version ? (
        <AppText variant="small" color="textTertiary" style={styles.version}>
          {fill(profileTr.version, { version })}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  signOut: { minHeight: touch.min, justifyContent: 'center', alignSelf: 'flex-start' },
  version: { marginTop: spacing.xs },
  pressed: { opacity: 0.6 },
});

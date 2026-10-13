import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { trRun } from '@/i18n';
import { colors, radius, screenPadding, spacing, touch } from '@/theme';

import type { StartPhase } from './useStartFlow';

type Props = {
  phase: StartPhase;
  failed: boolean;
  onAllow: () => void;
  onDismiss: () => void;
  onOpenSettings: () => void;
};

/** Konum izni açıklaması ve ret durumu. Alt panel; süs animasyonu yok. */
export function LocationPermissionSheet({ phase, failed, onAllow, onDismiss, onOpenSettings }: Props) {
  const insets = useSafeAreaInsets();
  if (phase === 'closed') return null;
  const denied = phase === 'denied';
  const copy = denied ? trRun.permission.denied : trRun.permission.rationale;
  const requesting = phase === 'requesting';

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={onDismiss}>
      <View style={styles.root}>
        <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={onDismiss} testID="permission-backdrop">
          <View style={[StyleSheet.absoluteFill, styles.backdrop]} />
        </Pressable>
        <View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <AppText variant="title2" accessibilityRole="header">
            {copy.title}
          </AppText>
          <AppText variant="body" color="textSecondary">
            {copy.body}
          </AppText>
          {failed ? (
            <AppText variant="secondary" color="danger" accessibilityLiveRegion="polite">
              {trRun.permission.error}
            </AppText>
          ) : null}
          {denied ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={trRun.permission.denied.openSettings}
                onPress={onOpenSettings}
                style={({ pressed }) => [styles.primary, { backgroundColor: pressed ? colors.primaryPressed : colors.primary }]}>
                <AppText variant="title3" color="onPrimary">
                  {trRun.permission.denied.openSettings}
                </AppText>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={trRun.permission.denied.close} onPress={onDismiss} style={styles.secondary}>
                <AppText variant="title3" color="textSecondary">
                  {trRun.permission.denied.close}
                </AppText>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={trRun.permission.rationale.allow}
                accessibilityState={{ disabled: requesting, busy: requesting }}
                disabled={requesting}
                onPress={onAllow}
                style={({ pressed }) => [
                  styles.primary,
                  { backgroundColor: pressed || requesting ? colors.primaryPressed : colors.primary },
                ]}>
                <AppText variant="title3" color="onPrimary">
                  {trRun.permission.rationale.allow}
                </AppText>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={trRun.permission.rationale.later} onPress={onDismiss} style={styles.secondary}>
                <AppText variant="title3" color="textSecondary">
                  {trRun.permission.rationale.later}
                </AppText>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: colors.canvas, opacity: 0.7 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: screenPadding,
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  primary: { height: touch.cta, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  secondary: { minHeight: touch.min, alignItems: 'center', justifyContent: 'center' },
});

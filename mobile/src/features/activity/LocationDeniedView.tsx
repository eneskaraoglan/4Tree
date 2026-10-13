import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { trActivity } from '@/i18n';
import { colors, radius, spacing, touch } from '@/theme';

import { CTA_HEIGHT } from './layout';

type Props = { onBack: () => void };

/** /activity açılırken konum izni yoksa: anlaşılır durum, "Ayarları aç" ve geri dön. */
export function LocationDeniedView({ onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { permission } = trActivity;
  return (
    <Screen>
      <View style={[styles.root, { paddingBottom: insets.bottom + spacing.lg }]}>
        <AppText variant="title1" accessibilityRole="header">
          {permission.title}
        </AppText>
        <AppText variant="body" color="textSecondary">
          {permission.body}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={permission.openSettings}
          onPress={() => {
            Linking.openSettings().catch(() => {});
          }}
          style={({ pressed }) => [styles.primary, { backgroundColor: pressed ? colors.primaryPressed : colors.primary }]}>
          <AppText variant="title2" color="onPrimary">
            {permission.openSettings}
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={permission.back}
          onPress={onBack}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <AppText variant="title3" color="textSecondary">
            {permission.back}
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  primary: { height: CTA_HEIGHT, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  secondary: { minHeight: touch.min, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
});

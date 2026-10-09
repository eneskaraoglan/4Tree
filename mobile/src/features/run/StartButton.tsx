import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { trRun } from '@/i18n';
import { colors, radius, spacing, touch } from '@/theme';

const PRESSED_SCALE = 0.97;
const ICON_SIZE = 28;
/**
 * Işıma (gölge yok; DESIGN.md: derinlik ışık halesiyle): üst üste 3 yumuşak katman, her biri ~5 dp kalın.
 * Dıştan içe taşma payı büyür, opaklık hızla söner; çerçeve değil, hale gibi görünür.
 * Etkin alfa, primaryGlow (0,28) x opacity: dış ~0,04, orta ~0,07, iç ~0,10 (üst üste binince ~0,04 / 0,11 / 0,20).
 */
const GLOW_LAYERS = [
  { inset: 15, opacity: 0.15 },
  { inset: 10, opacity: 0.25 },
  { inset: 5, opacity: 0.35 },
] as const;

type Props = {
  onPress?: () => void;
  accessibilityLabel?: string;
};

/** Geniş ana buton: solda eylem etiketi, sağda ok; yaprak yeşili dolgu ve ışıma. */
export function StartButton({ onPress, accessibilityLabel = trRun.start.label }: Props) {
  return (
    <View style={styles.wrap}>
      {GLOW_LAYERS.map(({ inset, opacity }) => (
        <View
          key={inset}
          pointerEvents="none"
          style={[styles.glow, { top: -inset, bottom: -inset, left: -inset, right: -inset, opacity }]}
        />
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
          onPress?.();
        }}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: pressed ? colors.primaryPressed : colors.primary },
          pressed && { transform: [{ scale: PRESSED_SCALE }] },
        ]}>
        <AppText variant="title2" color="onPrimary">
          {trRun.start.label}
        </AppText>
        <MaterialCommunityIcons name="arrow-right" size={ICON_SIZE} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center' },
  glow: { position: 'absolute', backgroundColor: colors.primaryGlow, borderRadius: radius.pill },
  button: {
    height: touch.cta,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

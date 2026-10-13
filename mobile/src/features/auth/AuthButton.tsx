import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, radius, spacing, touch } from '@/theme';

const PRESSED_SCALE = 0.97;
const SECONDARY_HEIGHT = 56;
/** Işıma (gölge yok; DESIGN.md: derinlik ışık halesiyle): sadece ekranın tek ana butonunda, iki yumuşak katman. */
const GLOW_LAYERS = [
  { inset: 10, opacity: 0.25 },
  { inset: 5, opacity: 0.4 },
] as const;

type Props = {
  label: string;
  onPress: () => void;
  /** primary: yaprak yeşili dolgu ve ışıma (ekranda en çok bir tane). secondary: yosun yüzey. */
  variant?: 'primary' | 'secondary';
  /** Çağrı sürüyor: etiket yerine `loadingLabel` ve dönen gösterge, dokunma kapalı. */
  loading?: boolean;
  loadingLabel?: string;
  /** Başka bir eylem sürerken bu buton da kapanır. */
  disabled?: boolean;
  /** Etiketin soluna konan küçük öğe (ör. Google harfi). */
  leading?: React.ReactNode;
};

/** Giriş akışının butonları: etiket eylemi söyler, yükleniyorken devre dışıdır. */
export function AuthButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  loadingLabel,
  disabled = false,
  leading,
}: Props) {
  const isPrimary = variant === 'primary';
  const inactive = loading || disabled;
  const textColor = isPrimary ? 'onPrimary' : 'text';
  const shownLabel = loading && loadingLabel ? loadingLabel : label;

  return (
    <View style={styles.wrap}>
      {isPrimary && !inactive
        ? GLOW_LAYERS.map(({ inset, opacity }) => (
            <View
              key={inset}
              pointerEvents="none"
              style={[styles.glow, { top: -inset, bottom: -inset, left: -inset, right: -inset, opacity }]}
            />
          ))
        : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={shownLabel}
        accessibilityState={{ disabled: inactive, busy: loading }}
        disabled={inactive}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onPress();
        }}
        style={({ pressed }) => [
          styles.button,
          isPrimary ? styles.primary : styles.secondary,
          isPrimary && pressed && { backgroundColor: colors.primaryPressed },
          pressed && { transform: [{ scale: PRESSED_SCALE }] },
          inactive && styles.inactive,
        ]}>
        {loading ? <ActivityIndicator color={isPrimary ? colors.onPrimary : colors.text} /> : leading}
        <AppText variant="title3" color={textColor}>
          {shownLabel}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center' },
  glow: { position: 'absolute', backgroundColor: colors.primaryGlow, borderRadius: radius.pill },
  button: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: spacing.md,
  },
  primary: { height: touch.cta, backgroundColor: colors.primary },
  secondary: { height: SECONDARY_HEIGHT, backgroundColor: colors.surface2 },
  inactive: { opacity: 0.6 },
});

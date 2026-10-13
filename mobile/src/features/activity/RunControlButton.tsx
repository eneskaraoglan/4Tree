import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, radius, spacing } from '@/theme';

import { RUN_CONTROL_HEIGHT } from './layout';

const PRESSED_SCALE = 0.97;

type Tone = 'primary' | 'neutral' | 'danger';

const TONES = {
  primary: { bg: colors.primary, pressed: colors.primaryPressed, text: 'onPrimary' },
  neutral: { bg: colors.surface2, pressed: colors.surface, text: 'text' },
  // danger metni yalnız canvas/surface üstünde AA: zemin surface.
  danger: { bg: colors.surface, pressed: colors.surface2, text: 'danger' },
} as const;

type Props = {
  label: string;
  tone: Tone;
  onPress?: () => void;
  onLongPress?: () => void;
  delayLongPress?: number;
  accessibilityHint?: string;
  onAccessibilityAction?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Koşarken basılan geniş buton (>= 64 dp). Tek metin, ikon yok: parlak yeşil yalnız ana eylemde. */
export function RunControlButton({
  label,
  tone,
  onPress,
  onLongPress,
  delayLongPress,
  accessibilityHint,
  onAccessibilityAction,
  style,
}: Props) {
  const t = TONES[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityActions={onAccessibilityAction ? [{ name: 'longpress', label }] : undefined}
      onAccessibilityAction={onAccessibilityAction ? () => onAccessibilityAction() : undefined}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed ? t.pressed : t.bg },
        pressed && { transform: [{ scale: PRESSED_SCALE }] },
        style,
      ]}>
      <AppText variant="title2" color={t.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: RUN_CONTROL_HEIGHT,
    minWidth: RUN_CONTROL_HEIGHT,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import { forwardRef, useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, fontFamily, radius, spacing, touch, typography } from '@/theme';

const INPUT_HEIGHT = 56;
const BORDER = 2;

type Props = Omit<TextInputProps, 'style' | 'accessibilityLabel'> & {
  /** Alanın üstünde görünen etiket; ekran okuyucu da bunu okur. */
  label: string;
  /** Satır içi doğrulama mesajı; varsa alan hata durumuna geçer. */
  error?: string | null;
  /** Hata yokken alanın altında görünen kısa yardım. */
  hint?: string;
  /** Girdinin sağına konan öğe (şifre göster/gizle). */
  trailing?: ReactNode;
};

/** Etiketi üstte, yosun yüzeyli metin alanı. Odakta yaprak yeşili, hatada kızıl çerçeve alır. */
export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, hint, trailing, onFocus, onBlur, ...inputProps },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const helper = error ?? hint;

  return (
    <View style={styles.field}>
      <AppText
        variant="secondary"
        color="textSecondary"
        style={styles.label}
        // Etiketi girdi kendi okur; görsel etiket ikinci kez okunmasın.
        accessibilityElementsHidden
        importantForAccessibility="no">
        {label}
      </AppText>
      <View style={[styles.box, focused && styles.focused, error ? styles.invalid : null]}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={helper}
          placeholderTextColor={colors.textSecondary}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          keyboardAppearance="dark"
          maxFontSizeMultiplier={1.3}
          style={styles.input}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...inputProps}
        />
        {trailing}
      </View>
      {/* Canlı bölge hep ekranda; hata metni girince duyurulur. */}
      <View accessibilityLiveRegion="polite" style={helper ? styles.helper : undefined}>
        {error ? (
          <AppText variant="secondary" color="danger" accessibilityRole="alert">
            {error}
          </AppText>
        ) : hint ? (
          <AppText variant="secondary" color="textSecondary">
            {hint}
          </AppText>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  field: {},
  label: { marginBottom: spacing.sm },
  box: {
    minHeight: INPUT_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.card,
    borderWidth: BORDER,
    borderColor: 'transparent',
    backgroundColor: colors.surface2,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
  },
  focused: { borderColor: colors.primary },
  invalid: { borderColor: colors.danger },
  input: {
    flex: 1,
    minHeight: touch.min,
    paddingVertical: spacing.md,
    paddingRight: spacing.sm,
    color: colors.text,
    fontFamily: fontFamily.regular,
    fontSize: typography.body.fontSize,
  },
  helper: { marginTop: spacing.sm },
});

import { PixelRatio, StyleSheet, Text, View, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { colors, typography, type ColorToken, type TypographyVariant } from '@/theme';

type AppTextColor = Extract<
  ColorToken,
  'text' | 'textSecondary' | 'textTertiary' | 'primary' | 'gold' | 'danger' | 'onPrimary' | 'bark' | 'water'
>;

type Props = TextProps & {
  variant?: TypographyVariant;
  color?: AppTextColor;
};

/** AppText sayaç varyantlarındaki maxFontSizeMultiplier ile aynı. */
const MAX_FONT_SCALE = 1.2;

const COUNTER_VARIANTS: TypographyVariant[] = ['timer', 'bigNumber'];

/** Tema tipografisini ve renklerini uygulayan metin bileşeni. */
export function AppText({ variant = 'body', color = 'text', style, ...rest }: Props) {
  const isCounter = COUNTER_VARIANTS.includes(variant);
  return (
    <Text
      maxFontSizeMultiplier={isCounter ? MAX_FONT_SCALE : undefined}
      style={[typography[variant], { color: colors[color] }, style]}
      {...rest}
    />
  );
}

type TabularNumberProps = {
  /** Gösterilecek metin, örn. "12,4" ya da "05:32". */
  value: string;
  variant?: Extract<TypographyVariant, 'timer' | 'bigNumber'>;
  color?: AppTextColor;
  /** Rakam kutusu genişliği, yazı boyutunun oranı olarak. */
  digitWidthRatio?: number;
  style?: StyleProp<TextStyle>;
};

/**
 * Sayaçta rakamlar zıplamasın diye her rakamı sabit genişlikli kutuda gösterir.
 * Fontun `tnum` özelliği (fontVariant) bir platformda çalışmazsa güvenli yedektir.
 */
export function TabularNumber({
  value,
  variant = 'timer',
  color = 'text',
  digitWidthRatio = 0.6,
  style,
}: TabularNumberProps) {
  // Sistem yazı boyutu büyüyünce rakam kutusu da büyür (üst sınır Text ile aynı).
  const fontScale = Math.min(PixelRatio.getFontScale(), MAX_FONT_SCALE);
  const digitWidth = typography[variant].fontSize * fontScale * digitWidthRatio;
  return (
    <View
      accessible
      accessibilityLabel={value}
      accessibilityRole="text"
      style={styles.row}
      testID="tabular-number">
      {Array.from(value).map((char, index) =>
        /\d/.test(char) ? (
          <View
            key={index}
            style={{ width: digitWidth, alignItems: 'center' }}
            testID="tabular-digit">
            <AppText variant={variant} color={color} style={style}>
              {char}
            </AppText>
          </View>
        ) : (
          <AppText key={index} variant={variant} color={color} style={style}>
            {char}
          </AppText>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline' },
});

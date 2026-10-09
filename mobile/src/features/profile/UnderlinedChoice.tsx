import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, spacing, touch } from '@/theme';

export type ChoiceOption<T extends string | number> = {
  value: T;
  label: string;
  /** Ekran okuyucu için daha açık ifade; verilmezse label okunur. */
  accessibilityLabel?: string;
};

type Props<T extends string | number> = {
  options: readonly ChoiceOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  /** Grubun adı (ekran okuyucu). */
  accessibilityLabel: string;
};

/** Hap/segment kutusu yok: seçili seçenek altı çizili metin (Koşu ekranındaki sekmelerle aynı dil). */
export function UnderlinedChoice<T extends string | number>({
  options,
  selected,
  onSelect,
  accessibilityLabel,
}: Props<T>) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={styles.group}>
      {options.map((option) => {
        const isSelected = option.value === selected;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="radio"
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityState={{ selected: isSelected, checked: isSelected }}
            onPress={() => onSelect(option.value)}
            style={({ pressed }) => [
              styles.option,
              { borderBottomColor: isSelected ? colors.primary : 'transparent' },
              pressed && styles.pressed,
            ]}>
            <AppText variant="body" color={isSelected ? 'text' : 'textSecondary'}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.xxl },
  option: {
    minHeight: touch.min,
    justifyContent: 'center',
    borderBottomWidth: 2,
  },
  pressed: { opacity: 0.6 },
});

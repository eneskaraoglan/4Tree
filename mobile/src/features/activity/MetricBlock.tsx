import { StyleSheet, View } from 'react-native';

import { AppText, TabularNumber } from '@/components/AppText';
import { spacing } from '@/theme';

type Props = {
  label: string;
  value: string;
  unit?: string;
  variant?: 'timer' | 'bigNumber';
  /** Ekran okuyucuya okunacak tam cümle (değer + birim). */
  accessibilityLabel: string;
};

/** Etiket + büyük sayı (+ birim). Sayı sabit genişlikli rakam kutularında, zıplamaz. */
export function MetricBlock({ label, value, unit, variant = 'bigNumber', accessibilityLabel }: Props) {
  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={styles.block}>
      <AppText variant="secondary" color="textSecondary" accessibilityElementsHidden>
        {label}
      </AppText>
      <View style={styles.valueRow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <TabularNumber value={value} variant={variant} />
        {unit ? (
          <AppText variant="title3" color="textSecondary">
            {unit}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.xs },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', columnGap: spacing.sm },
});

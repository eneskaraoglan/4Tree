import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { forestTr } from '@/i18n';
import { spacing } from '@/theme';

import { formatCount } from './format';
import { estimateCo2Kg } from './impact';

/** Sol hizalı iki büyük sayı: ağaç sayısı ve tahmini CO₂ (kg/yıl). */
export function ForestStats({ treeCount }: { treeCount: number }) {
  const trees = formatCount(treeCount);
  const co2 = formatCount(estimateCo2Kg(treeCount));
  return (
    <View style={styles.row}>
      <View accessible accessibilityLabel={forestTr.stats.treesLabel(trees)} style={styles.stat}>
        <AppText variant="bigNumber">{trees}</AppText>
        <AppText variant="secondary" color="textSecondary">
          {forestTr.stats.trees}
        </AppText>
      </View>
      <View accessible accessibilityLabel={forestTr.stats.co2Label(co2)} style={styles.stat}>
        <AppText variant="bigNumber">{co2}</AppText>
        <AppText variant="secondary" color="textSecondary">
          {forestTr.stats.co2}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.huge, rowGap: spacing.lg },
  stat: { alignItems: 'flex-start' },
});

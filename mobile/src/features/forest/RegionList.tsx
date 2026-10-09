import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { forestTr } from '@/i18n';
import { spacing, touch } from '@/theme';

import { formatCount } from './format';
import type { RegionSummary } from './regions';
import { SampleTag } from './SampleTag';

/** Dikim bölgeleri: kartsız satırlar (bölge adı, ağaç sayısı). İçerik temsilidir. */
export function RegionList({ regions }: { regions: readonly RegionSummary[] }) {
  return (
    <View>
      <View style={styles.header}>
        <AppText variant="title3" accessibilityRole="header">
          {forestTr.regions.title}
        </AppText>
        <SampleTag label={forestTr.regions.sample} />
      </View>
      {regions.map((region) => (
        <View key={region.name} accessible style={styles.row}>
          <AppText variant="body" style={styles.name}>
            {region.name}
          </AppText>
          <AppText variant="secondary" color="textSecondary">
            {forestTr.regions.treeCount(formatCount(region.treeCount))}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', columnGap: spacing.md, marginBottom: spacing.xs },
  row: {
    minHeight: touch.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: spacing.lg,
  },
  name: { flexShrink: 1 },
});

import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { trFeed } from '@/i18n';
import { colors, spacing } from '@/theme';
import type { ReactionCounts } from '@/types';

import { REACTION_SIZES, type ReactionBarSize } from './layout';
import { REACTIONS, summarizeCounts } from './reactions';

/** En çok bu kadar türün ikonu üst üste gösterilir. */
export const MAX_SUMMARY_ICONS = 3;

type Props = {
  counts: ReactionCounts;
  size?: ReactionBarSize;
  testID?: string;
};

/** Tepki özeti: kullanılan (en çok 3) türün küçük ikonları üst üste ve toplam sayı. Toplam 0 ise hiç görünmez. */
export function ReactionSummary({ counts, size = 'md', testID = 'reaction-summary' }: Props) {
  const entries = summarizeCounts(counts);
  const total = entries.reduce((sum, entry) => sum + entry.count, 0);
  if (total === 0) return null;

  const metrics = REACTION_SIZES[size];
  // En çok kullanılan önde; eşitlikte tepki sırası.
  const top = [...entries].sort((a, b) => b.count - a.count).slice(0, MAX_SUMMARY_ICONS);
  const breakdown = entries
    .map((entry) => trFeed.reactions.summaryPart(REACTIONS[entry.type].label, entry.count))
    .join(', ');

  return (
    <View
      accessible
      accessibilityLabel={trFeed.reactions.summary(total, breakdown)}
      style={styles.row}
      testID={testID}>
      <View style={styles.icons}>
        {top.map((entry, index) => {
          const { Icon, color } = REACTIONS[entry.type];
          return (
            <View
              key={entry.type}
              style={[
                styles.ring,
                {
                  width: metrics.summaryRing,
                  height: metrics.summaryRing,
                  borderRadius: metrics.summaryRing / 2,
                  marginLeft: index === 0 ? 0 : -spacing.xs - 2,
                  zIndex: top.length - index,
                },
              ]}
              testID={`reaction-summary-icon-${entry.type}`}>
              <Icon size={metrics.summaryIcon} color={colors[color]} />
            </View>
          );
        })}
      </View>
      <AppText variant="secondary" color="textSecondary" style={styles.total}>
        {total}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icons: { flexDirection: 'row', alignItems: 'center' },
  // Üst üste binen ikonlar canvas renginde bir halkayla ayrılır; çerçeve ya da gölge yok.
  ring: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas },
  total: { fontVariant: ['tabular-nums'] },
});

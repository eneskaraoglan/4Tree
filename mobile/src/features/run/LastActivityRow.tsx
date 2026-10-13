import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { RouteLine } from '@/components/RouteLine';
import { trRun } from '@/i18n';
import { spacing } from '@/theme';
import type { Activity } from '@/types';

import { formatDuration, formatKm, formatRelativeDay } from './format';

const ROUTE_WIDTH = 72;
const ROUTE_HEIGHT = 56;

type Props = {
  activity: Activity;
  now: Date;
};

/** "Son aktiviten": kartsız tek satır. Solda mini rota, ortada tür + mesafe + süre, sağda göreli tarih. */
export function LastActivityRow({ activity, now }: Props) {
  const typeLabel = activity.type === 'walk' ? trRun.last.walk : trRun.last.run;
  return (
    <View style={styles.row}>
      <RouteLine points={activity.route} width={ROUTE_WIDTH} height={ROUTE_HEIGHT} strokeWidth={2} />
      <View style={styles.stats}>
        <AppText variant="small" color="textSecondary">
          {trRun.last.title}
        </AppText>
        <AppText variant="title3">
          {trRun.last.stats(typeLabel, formatKm(activity.distanceKm), formatDuration(activity.durationSec))}
        </AppText>
      </View>
      <AppText variant="secondary" color="textSecondary">
        {formatRelativeDay(activity.startedAt, now)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  stats: { flex: 1 },
});

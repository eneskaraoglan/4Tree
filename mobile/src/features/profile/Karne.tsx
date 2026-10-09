import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { profileTr } from '@/i18n';
import { spacing } from '@/theme';
import type { Profile } from '@/types';

import { formatNumber } from './format';

type Props = { profile: Profile };

/**
 * "Karne": üç büyük sayı, ızgara değil. Toplam km tek başına büyük (timer ölçeği); ağaç ve gün
 * altında yan yana ama farklı yükseklikte, böylece okuma akışı kırılır.
 */
export function Karne({ profile }: Props) {
  const km = formatNumber(profile.totalKm);
  const trees = formatNumber(profile.totalTrees, 0);
  const days = formatNumber(profile.activeDays, 0);
  const isNewUser = profile.totalKm === 0 && profile.totalTrees === 0 && profile.activeDays === 0;

  return (
    <View>
      <View accessible accessibilityLabel={`${km} ${profileTr.stats.km}`}>
        <AppText variant="timer">{km}</AppText>
        <AppText variant="body" color="textSecondary">
          {profileTr.stats.km}
        </AppText>
      </View>

      <View style={styles.lower}>
        <View accessible accessibilityLabel={`${trees} ${profileTr.stats.trees}`} style={styles.trees}>
          <AppText variant="bigNumber" color="primary">
            {trees}
          </AppText>
          <AppText variant="secondary" color="textSecondary">
            {profileTr.stats.trees}
          </AppText>
        </View>
        <View accessible accessibilityLabel={`${days} ${profileTr.stats.days}`} style={styles.days}>
          <AppText variant="bigNumber">
            {days}
          </AppText>
          <AppText variant="secondary" color="textSecondary">
            {profileTr.stats.days}
          </AppText>
        </View>
      </View>

      {isNewUser ? (
        <AppText variant="body" style={styles.hint}>
          {profileTr.stats.emptyHint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  lower: { flexDirection: 'row', alignItems: 'flex-start', columnGap: spacing.xxl, marginTop: spacing.xxxl },
  trees: { flex: 3 },
  /** Gün sayısı ağaçtan aşağıda başlar: sayılar aynı hizada durmaz. */
  days: { flex: 2, marginTop: spacing.huge },
  hint: { marginTop: spacing.xxl },
});

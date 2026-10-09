import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { achievements } from '@/i18n';
import { colors, spacing } from '@/theme';
import type { LevelProgress } from '@/types';

import { treesToNextLevel } from './levelCopy';

type Props = { level: LevelProgress };

const BAR_HEIGHT = 6;

/** Büyük seviye adı, bir sonraki seviyeye somut cümle ve ince ilerleme çizgisi. */
export function LevelSummary({ level }: Props) {
  const remaining = treesToNextLevel(level);
  const sentence =
    level.nextLevel && remaining != null
      ? achievements.path.toNext(achievements.levels[level.nextLevel], remaining)
      : achievements.path.topLevel;
  const percent = Math.round(Math.min(1, Math.max(0, level.progress)) * 100);

  return (
    <View style={styles.wrap}>
      <AppText variant="bigNumber" testID="level-name" accessibilityRole="header">
        {achievements.levels[level.level]}
      </AppText>
      <AppText variant="body" color="textSecondary" style={styles.sentence} testID="level-sentence">
        {sentence}
      </AppText>
      {level.nextLevel ? (
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={achievements.path.progressLabel(percent)}
          accessibilityValue={{ min: 0, max: 100, now: percent }}
          style={styles.track}>
          <View style={[styles.fill, { width: `${percent}%` }]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.xl },
  sentence: { marginTop: spacing.xs },
  track: {
    marginTop: spacing.md,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
  },
  fill: { height: BAR_HEIGHT, borderRadius: BAR_HEIGHT / 2, backgroundColor: colors.primary },
});

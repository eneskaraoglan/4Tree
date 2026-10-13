import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import type { TrackerSnapshot } from '@/features/activity/trackerReducer';
import { trRun } from '@/i18n';
import { colors, radius, spacing, touch } from '@/theme';

import { formatDuration, formatKm } from './format';

type Props = {
  draft: TrackerSnapshot;
  onResume: () => void;
  onSave: () => void;
  onDiscard: () => void;
};

/** Uygulama kapanınca yarım kalan aktivite: devam et / kaydet / sil. Başla'nın yerine geçer (taslak üzerine yazılmasın). */
export function DraftRecovery({ draft, onResume, onSave, onDiscard }: Props) {
  const stats = trRun.recovery.stats(formatKm(draft.distanceM / 1000), formatDuration(draft.activeMs / 1000));
  return (
    <View style={styles.root}>
      <View>
        <AppText variant="title2" accessibilityRole="header">
          {trRun.recovery.title}
        </AppText>
        <AppText variant="body" color="textSecondary">
          {stats}
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={trRun.recovery.resume}
        onPress={onResume}
        style={({ pressed }) => [styles.primary, { backgroundColor: pressed ? colors.primaryPressed : colors.primary }]}>
        <AppText variant="title2" color="onPrimary">
          {trRun.recovery.resume}
        </AppText>
      </Pressable>
      <View style={styles.secondaryRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={trRun.recovery.save} onPress={onSave} style={styles.secondary}>
          <AppText variant="title3" color="text">
            {trRun.recovery.save}
          </AppText>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={trRun.recovery.discard} onPress={onDiscard} style={styles.secondary}>
          <AppText variant="title3" color="danger">
            {trRun.recovery.discard}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  primary: { height: touch.cta, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  secondaryRow: { flexDirection: 'row', justifyContent: 'center', columnGap: spacing.xxxl },
  secondary: { minHeight: touch.min, minWidth: touch.min, justifyContent: 'center', alignItems: 'center' },
});

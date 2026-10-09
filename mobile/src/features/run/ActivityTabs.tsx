import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { trRun } from '@/i18n';
import { colors, spacing, touch } from '@/theme';
import type { ActivityType } from '@/types';

const OPTIONS: { type: ActivityType; label: string }[] = [
  { type: 'run', label: trRun.tabs.run },
  { type: 'walk', label: trRun.tabs.walk },
];

const UNDERLINE = 2;

type Props = {
  selected: ActivityType;
  onChange: (type: ActivityType) => void;
};

/** Altı çizili metin sekmeleri (hap/segment kutusu yok). Seçim yerel durumdur. */
export function ActivityTabs({ selected, onChange }: Props) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={trRun.tabs.label} style={styles.row}>
      {OPTIONS.map(({ type, label }) => {
        const isSelected = type === selected;
        return (
          <Pressable
            key={type}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            onPress={() => {
              if (isSelected) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              onChange(type);
            }}
            style={styles.tab}>
            <View style={[styles.label, isSelected && styles.labelSelected]}>
              <AppText variant="title3" color={isSelected ? 'primary' : 'textSecondary'}>
                {label}
              </AppText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl },
  tab: { minHeight: touch.min, minWidth: touch.min, justifyContent: 'center', alignItems: 'center' },
  label: { paddingBottom: spacing.xs, borderBottomWidth: UNDERLINE, borderBottomColor: 'transparent' },
  labelSelected: { borderBottomColor: colors.primary },
});

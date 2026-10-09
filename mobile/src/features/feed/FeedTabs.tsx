import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { trFeed } from '@/i18n';
import type { FeedScope } from '@/services';
import { colors, spacing, touch } from '@/theme';

import { hapticReaction } from './haptics';
import { TAB_UNDERLINE } from './layout';

const OPTIONS: { scope: FeedScope; label: string }[] = [
  { scope: 'friends', label: trFeed.tabs.friends },
  { scope: 'everyone', label: trFeed.tabs.everyone },
];

type Props = {
  selected: FeedScope;
  onChange: (scope: FeedScope) => void;
};

/** Sol hizalı, altı çizili metin sekmeleri (hap/segment kutusu yok). */
export function FeedTabs({ selected, onChange }: Props) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={trFeed.tabs.label} style={styles.row}>
      {OPTIONS.map(({ scope, label }) => {
        const isSelected = scope === selected;
        return (
          <Pressable
            key={scope}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            onPress={() => {
              if (isSelected) return;
              hapticReaction();
              onChange(scope);
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
  row: { flexDirection: 'row', gap: spacing.xxl },
  tab: { minHeight: touch.min, minWidth: touch.min, justifyContent: 'center' },
  label: { alignSelf: 'flex-start', paddingBottom: spacing.xs, borderBottomWidth: TAB_UNDERLINE, borderBottomColor: 'transparent' },
  labelSelected: { borderBottomColor: colors.primary },
});

import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, radius, spacing } from '@/theme';

/** Temsili içerik etiketi ("Örnek"). Küçük, cümle düzeni, ince çerçeveli. */
export function SampleTag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <AppText variant="small" color="textSecondary">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.textTertiary,
  },
});

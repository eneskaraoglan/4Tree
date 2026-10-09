import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, screenPadding } from '@/theme';

type Props = { children: ReactNode };

/** Koyu zeminli, safe area'ya saygılı ortak ekran kabuğu. Alt kenarı tab bar karşılar. */
export function Screen({ children }: Props) {
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { flex: 1, paddingHorizontal: screenPadding, paddingTop: screenPadding },
});

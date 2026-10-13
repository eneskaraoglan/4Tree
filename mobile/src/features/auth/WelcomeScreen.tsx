import { useMemo } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { ForestScene, TREE_SPECIES, type ForestSceneTree } from '@/components/illustration';
import { authTr, fill } from '@/i18n';
import { KM_PER_TREE } from '@/services';
import { colors, screenPadding, spacing } from '@/theme';

import { AuthButton } from './AuthButton';

/** Karşılama sahnesindeki ağaç sayısı: dolu bir orman değil, başlamış bir orman. */
const HERO_TREES = 11;
/** Sahnenin ekran yüksekliğine oranı (yarıdan biraz fazla). */
const HERO_HEIGHT_RATIO = 0.6;
const HERO_MIN_HEIGHT = 280;

type Props = {
  onRegister: () => void;
  onLogin: () => void;
};

/** İlk izlenim: gün batımında küçük bir orman, tek cümlelik değer önerisi, iki buton. */
export function WelcomeScreen({ onRegister, onLogin }: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const heroHeight = Math.max(HERO_MIN_HEIGHT, Math.round(windowHeight * HERO_HEIGHT_RATIO));
  const trees = useMemo<ForestSceneTree[]>(
    () =>
      Array.from({ length: HERO_TREES }, (_, i) => ({
        id: `welcome-${i}`,
        species: TREE_SPECIES[i % TREE_SPECIES.length],
        seed: 11 + i * 5,
      })),
    [],
  );

  return (
    <View style={styles.root}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={styles.hero}>
        <ForestScene trees={trees} height={heroHeight} />
      </View>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}>
          <AppText variant="title2" style={styles.brand} accessibilityRole="header">
            {authTr.brand}
          </AppText>
          <View style={styles.bottom}>
            <AppText variant="title1" accessibilityRole="header">
              {fill(authTr.welcome.tagline, { km: KM_PER_TREE })}
            </AppText>
            <AppText variant="body" color="textSecondary" style={styles.subtitle}>
              {authTr.welcome.subtitle}
            </AppText>
            <View style={styles.actions}>
              <AuthButton label={authTr.welcome.register} onPress={onRegister} />
              <AuthButton variant="secondary" label={authTr.welcome.login} onPress={onLogin} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  hero: { position: 'absolute', top: 0, left: 0, right: 0 },
  safe: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: screenPadding, paddingBottom: spacing.xxl },
  brand: { marginTop: spacing.lg },
  bottom: { flexGrow: 1, justifyContent: 'flex-end', paddingTop: spacing.huge },
  subtitle: { marginTop: spacing.sm },
  actions: { marginTop: spacing.xxxl, rowGap: spacing.lg },
});

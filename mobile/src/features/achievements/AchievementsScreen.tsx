import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { achievements } from '@/i18n';
import { colors, radius, screenPadding, spacing, touch } from '@/theme';
import type { Badge } from '@/types';

import { countEarned, orderBadges } from './badges';
import { contentWidthFor, MAX_CONTENT_WIDTH } from './layout';
import { LevelPath } from './LevelPath';
import { LevelSummary } from './LevelSummary';
import { StampGrid } from './StampGrid';
import { StampSheet } from './StampSheet';
import { useAchievements, type AchievementsData } from './useAchievements';

function Passport({ data }: { data: AchievementsData }) {
  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = contentWidthFor(windowWidth);
  const [selected, setSelected] = useState<Badge | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const badges = orderBadges(data.badges);
  const earned = countEarned(badges);

  const handleSelect = (badge: Badge) => {
    // Kazanılmış pula Medium, kilitliye Light; haptic desteklenmiyorsa (web) sessizce geçilir.
    const style = badge.earned ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light;
    Haptics.impactAsync(style).catch(() => {});
    setSelected(badge);
    setSheetOpen(true);
  };

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        style={styles.scrollView}>
        <LevelPath current={data.level.level} />
        <LevelSummary level={data.level} />
        <View style={styles.stamps}>
          {earned === 0 ? (
            <AppText variant="body" color="textSecondary" style={styles.summary} testID="empty-hint">
              {achievements.emptyHint}
            </AppText>
          ) : (
            <AppText variant="title3" style={styles.summary} testID="stamp-summary">
              {achievements.summary(earned, badges.length)}
            </AppText>
          )}
          <StampGrid badges={badges} width={contentWidth} onSelect={handleSelect} />
        </View>
      </ScrollView>
      <StampSheet badge={selected} visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}

function LoadingView() {
  return (
    <View style={styles.center} testID="achievements-loading">
      <ActivityIndicator color={colors.primary} />
      <AppText variant="secondary" color="textSecondary" style={styles.centerText}>
        {achievements.loading}
      </AppText>
    </View>
  );
}

function ErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.center} testID="achievements-error">
      <AppText variant="body" style={styles.centerText}>
        {achievements.error.message}
      </AppText>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}>
        <AppText variant="title3" color="onPrimary">
          {achievements.error.retry}
        </AppText>
      </Pressable>
    </View>
  );
}

/** Orman pasaportu: seviye yolu ve posta pulu rozetleri. */
export function AchievementsScreen() {
  const { state, retry } = useAchievements();
  return (
    <Screen>
      <AppText variant="title2" accessibilityRole="header">
        {achievements.title}
      </AppText>
      {state.status === 'loading' ? <LoadingView /> : null}
      {state.status === 'error' ? <ErrorView onRetry={retry} /> : null}
      {state.status === 'ready' ? <Passport data={state.data} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1, marginHorizontal: -screenPadding },
  scroll: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.huge,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  stamps: { marginTop: spacing.huge },
  summary: { marginBottom: spacing.xxl },
  center: { flex: 1, alignItems: 'flex-start', justifyContent: 'center', paddingBottom: spacing.huge },
  centerText: { marginTop: spacing.md },
  retry: {
    marginTop: spacing.xl,
    minHeight: touch.min + 4,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryPressed: { backgroundColor: colors.primaryPressed },
});

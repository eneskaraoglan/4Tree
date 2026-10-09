import { useCallback, useState } from 'react';
import { PixelRatio, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, TabularNumber } from '@/components/AppText';
import { TreeRings } from '@/components/illustration';
import { Screen } from '@/components/Screen';
import { trRun } from '@/i18n';
import { ServiceError, KM_PER_TREE } from '@/services';
import { colors, radius, screenPadding, spacing, touch } from '@/theme';
import type { Activity, ActivityType } from '@/types';

import { ActivityTabs } from './ActivityTabs';
import { formatKm, getSalutation, getTreeProgress, pickCounterVariant } from './format';
import { LastActivityRow } from './LastActivityRow';
import { StartButton } from './StartButton';
import { useRunData } from './useRunData';
import { useRunRefresh } from './useRunRefresh';

/** Halkanın ekran yüksekliğine oranı (DESIGN.md: ~%45). */
const RING_HEIGHT_RATIO = 0.45;
const RING_HOLE_RATIO = 0.5;
/** Çizilen halkanın kutu kenarından içeride kalan payı (kutu oranı); altındaki cümle sıkı dursun diye geri alınır. */
const RING_INNER_MARGIN = 0.06;
const BAR_HEIGHT = 20;
const HEADER_HEIGHT = 36;
const FOOTER_HEIGHT = 56;
const CONTENT_GAP = spacing.lg;
/** Halka altındaki tek satırlık cümle (body satır yüksekliği). */
const CAPTION_HEIGHT = 24;
/** Halka dışındaki dikey içerik: üst boşluk, selam, aralıklar, alt yazı, sekmeler + Başla, son satır, alt boşluk. */
const RESERVED_HEIGHT =
  screenPadding +
  HEADER_HEIGHT +
  3 * CONTENT_GAP +
  (CAPTION_HEIGHT + CONTENT_GAP) +
  (touch.min + spacing.md + touch.cta) +
  FOOTER_HEIGHT +
  spacing.xxl;
const MIN_RING_SIZE = 180;
/** Sistem yazı ölçeği için üst sınır (AppText sayaç varyantlarıyla aynı). */
const MAX_FONT_SCALE = 1.2;

type Props = {
  /** Başla'ya basılınca çağrılır (aktif koşu ekranı ayrı görev). */
  onStart?: (type: ActivityType) => void;
  /** Selam ve göreli tarih için "şimdi"; testlerde sabitlenir. */
  now?: Date;
};

function errorMessage(error: unknown): string {
  if (error instanceof ServiceError) {
    if (error.code === 'network') return trRun.error.network;
    if (error.code === 'not_found') return trRun.error.notFound;
    if (error.code === 'invalid') return trRun.error.invalid;
  }
  return trRun.error.generic;
}

function SkeletonBar({ width, height = BAR_HEIGHT }: { width: number; height?: number }) {
  return <View style={[styles.bar, { width, height }]} />;
}

function latestOfType(activities: Activity[], type: ActivityType): Activity | undefined {
  return activities.find((a) => a.type === type);
}

/** Koşu sekmesi ana ekranı: selam, ağaç halkası, aktivite sekmeleri, Başla ve son aktivite. */
export function RunScreen({ onStart, now }: Props) {
  const data = useRunData();
  const [clock, setClock] = useState(() => now ?? new Date());
  const [type, setType] = useState<ActivityType>('run');
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Odaklanınca ve uygulama öne gelince: saat tazelenir (now verilmişse sabit kalır), veri sessizce yenilenir.
  const { refresh } = data;
  const onRefresh = useCallback(() => {
    if (!now) setClock(new Date());
    refresh();
  }, [now, refresh]);
  useRunRefresh(onRefresh);

  // Halka: ekranın ~%45'i, ama Son koşun satırı görünür kalsın diye safe area, tab bar ve diğer içerik düşülür.
  const usableHeight = height - insets.top - insets.bottom - touch.tabBar;
  const ringSize = Math.round(
    Math.max(
      MIN_RING_SIZE,
      Math.min(height * RING_HEIGHT_RATIO, width - 2 * screenPadding, usableHeight - RESERVED_HEIGHT),
    ),
  );
  const hole = ringSize * RING_HOLE_RATIO;
  const counterVariant = pickCounterVariant(hole, Math.min(PixelRatio.getFontScale(), MAX_FONT_SCALE));
  const salutation = getSalutation(clock);

  const ready = data.status === 'ready' ? data : null;
  const totalKm = ready?.profile.totalKm ?? 0;
  const tree = getTreeProgress(totalKm);
  const isNewUser = ready !== null && totalKm <= 0;
  const last = ready ? latestOfType(ready.activities, type) : undefined;

  const ringLabel = !ready
    ? data.status === 'loading'
      ? trRun.ring.loading
      : undefined
    : isNewUser
      ? trRun.ring.a11yEmpty
      : trRun.ring.a11y(formatKm(tree.doneKm), formatKm(tree.remainingKm));

  return (
    <Screen>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        accessibilityState={{ busy: data.status === 'loading' }}>
        <View style={styles.header}>
          {data.status === 'loading' ? (
            <SkeletonBar width={200} height={28} />
          ) : (
            <AppText variant="title1" accessibilityRole="header">
              {trRun.greet(salutation, ready?.profile.name)}
            </AppText>
          )}
        </View>

        <View style={styles.ringBlock}>
          {/* Hata durumunda halka anlamsız bir ilerleme çubuğu olur; erişilebilirlikten gizlenir. */}
          <View
            accessibilityElementsHidden={data.status === 'error'}
            importantForAccessibility={data.status === 'error' ? 'no-hide-descendants' : 'auto'}>
            <TreeRings
              progress={ready ? tree.progress : 0}
              size={ringSize}
              holeRatio={RING_HOLE_RATIO}
              animated={ready !== null}
              showTip={ready !== null && !isNewUser}
              accessibilityLabel={ringLabel}>
              {ready ? (
                // Halkanın kendi etiketi sayıları zaten söyler; ekran okuyucu tekrar okumasın.
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={styles.counter}>
                  <TabularNumber value={formatKm(tree.doneKm)} variant={counterVariant} />
                  <AppText variant="secondary" color="textSecondary" maxFontSizeMultiplier={MAX_FONT_SCALE}>
                    {trRun.ring.of(String(KM_PER_TREE))}
                  </AppText>
                </View>
              ) : null}
            </TreeRings>
          </View>

          <View style={[styles.ringCaption, { marginTop: -ringSize * RING_INNER_MARGIN }]}>
            {data.status === 'loading' ? <SkeletonBar width={180} /> : null}
            {ready ? (
              <AppText variant="body" color="textSecondary" style={styles.centered}>
                {isNewUser ? trRun.ring.emptyTree : trRun.ring.remaining(formatKm(tree.remainingKm))}
              </AppText>
            ) : null}
            {data.status === 'error' ? (
              <>
                <AppText variant="body" color="textSecondary" style={styles.centered}>
                  {errorMessage(data.error)}
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  onPress={data.retry}
                  style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}>
                  <AppText variant="title3" color="primary">
                    {trRun.error.retry}
                  </AppText>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>

        <View style={styles.actions}>
          <ActivityTabs selected={type} onChange={setType} />
          <StartButton
            onPress={() => onStart?.(type)}
            accessibilityLabel={type === 'walk' ? trRun.start.a11yWalk : trRun.start.a11yRun}
          />
        </View>

        <View style={styles.footer}>
          {data.status === 'loading' ? <SkeletonBar width={240} height={40} /> : null}
          {ready && last ? <LastActivityRow activity={last} now={clock} /> : null}
          {ready && !last ? (
            <AppText variant="body" color="textSecondary">
              {type === 'walk' ? trRun.last.nextStepWalk : trRun.last.nextStepRun}
            </AppText>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Işıma halkası Screen yan boşluğuna taşabilsin diye kenarlar dışarı alınıp içerde geri verilir.
  scroll: { marginHorizontal: -screenPadding },
  content: {
    flexGrow: 1,
    paddingHorizontal: screenPadding,
    paddingBottom: spacing.xxl,
    gap: CONTENT_GAP,
    justifyContent: 'space-between',
  },
  header: { minHeight: HEADER_HEIGHT, justifyContent: 'center' },
  ringBlock: { alignItems: 'center', gap: CONTENT_GAP },
  ringCaption: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  counter: { alignItems: 'center' },
  centered: { textAlign: 'center' },
  actions: { gap: spacing.md },
  footer: { minHeight: FOOTER_HEIGHT, justifyContent: 'center' },
  bar: { backgroundColor: colors.surface, borderRadius: radius.sm },
  retry: {
    minHeight: touch.min,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface2,
  },
  retryPressed: { backgroundColor: colors.surface },
});

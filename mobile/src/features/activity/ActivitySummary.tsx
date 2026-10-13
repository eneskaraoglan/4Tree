import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, TabularNumber } from '@/components/AppText';
import { TreeRings } from '@/components/illustration';
import { RouteLine } from '@/components/RouteLine';
import { Screen } from '@/components/Screen';
import { confirmAction } from '@/features/profile/confirmAction';
import { UnderlinedChoice } from '@/features/profile/UnderlinedChoice';
import { formatKm, getTreeProgress } from '@/features/run/format';
import { trActivity } from '@/i18n';
import { kmToTrees, ServiceError, useServices } from '@/services';
import { colors, radius, screenPadding, spacing, touch } from '@/theme';
import type { ActivityType } from '@/types';

import { useActivityEnvironment } from './ActivityEnvironment';
import { classifyActivity } from './classify';
import { formatClock, formatDistance } from './format';
import { decimate } from './geo';
import { hapticFinish } from './haptics';
import { CTA_HEIGHT } from './layout';
import { formatPace, averagePace } from './pace';
import { MIN_SAVE_DISTANCE_KM, type TrackResult } from './trackerReducer';

const ROUTE_HEIGHT = 200;
const ROUTE_STROKE = 3;
/** Özet çiziminde en fazla nokta (uzun aktivitelerde çizim akıcı kalsın). */
const MAX_ROUTE_POINTS = 400;
const TREE_RING_SIZE = 64;

type Props = {
  result: TrackResult;
  /** Aktivite öncesi toplam km; bilinmiyorsa ağaç satırı gösterilmez. */
  baselineKm: number | null;
  /** Oturumdaki kullanıcı; kuyruğa alınan kayıt bu hesaba ait olur. */
  userId: string | null;
  /** Kaydedildi/silindi/kuyruğa alındı: ekrandan çıkılır. */
  onDone: () => void;
};

type Phase = 'editing' | 'saving' | 'queued';

/**
 * Bitiş özeti: tür (otomatik önerilir, tek dokunuşla değişir), mesafe, süre, tempo, rota, kazanılan ağaç.
 * Kaydet başarısızsa aktivite yerel kuyruğa alınır ve bağlantı gelince gönderilir.
 */
export function ActivitySummary({ result, baselineKm, userId, onDone }: Props) {
  const services = useServices();
  const { queue, drafts } = useActivityEnvironment();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const classification = useMemo(() => classifyActivity(result.points), [result.points]);
  const [type, setType] = useState<ActivityType>(classification.type);
  const [phase, setPhase] = useState<Phase>('editing');
  const [saveError, setSaveError] = useState<'storage' | 'rejected' | null>(null);
  const drawnRoute = useMemo(() => decimate(result.route, MAX_ROUTE_POINTS) as { lat: number; lng: number }[], [result.route]);
  const busy = useRef(false);
  const { summary } = trActivity;

  const typeLabel = (t: ActivityType) => (t === 'run' ? summary.run : summary.walk);
  const options = [
    { value: 'run' as const, label: summary.run },
    { value: 'walk' as const, label: summary.walk },
  ];

  const distance = formatDistance(result.distanceKm);
  const duration = formatClock(result.durationSec);
  const pace = formatPace(averagePace(result.distanceKm, result.durationSec));
  const routeWidth = width - 2 * screenPadding;

  // Aynı aktivite (aynı başlangıç anı) kuyruğa iki kez girmez.
  const localId = `local-${result.startedAt}`;

  const finishAndLeave = async () => {
    try {
      await drafts.clear();
    } catch {
      // Taslak silinemese de aktivite güvende; sonraki açılışta tekrar silinebilir.
    }
    onDone();
  };

  const save = async () => {
    if (busy.current) return;
    busy.current = true;
    setSaveError(null);
    setPhase('saving');
    const input = {
      type,
      durationSec: result.durationSec,
      startedAt: result.startedAt,
      route: result.route,
      distanceKm: result.distanceKm,
    };
    let saved = false;
    try {
      await services.activity.saveActivity(input);
      saved = true;
    } catch (error) {
      // Sunucu aktiviteyi geçersiz saydıysa tekrar göndermek işe yaramaz: kuyruğa alınmaz, kullanıcıya söylenir.
      if (error instanceof ServiceError && error.code === 'invalid') {
        setSaveError('rejected');
        setPhase('editing');
        busy.current = false;
        return;
      }
      // Ağ yok ya da sunucu hatası: aktivite kaybolmasın, yerel kuyruğa alınır.
    }
    if (saved) {
      hapticFinish();
      await finishAndLeave();
      return;
    }
    try {
      await queue.enqueue(localId, input, userId);
      try {
        await drafts.clear();
      } catch {
        // Kuyrukta güvende; taslak kalırsa sonraki temizlikte silinir.
      }
      setPhase('queued');
    } catch {
      setSaveError('storage');
      setPhase('editing');
    } finally {
      busy.current = false;
    }
  };

  const discard = () =>
    confirmAction({
      title: summary.discardConfirm.title,
      message: summary.discardConfirm.message,
      confirmLabel: summary.discardConfirm.confirm,
      cancelLabel: summary.discardConfirm.cancel,
      onConfirm: () => void finishAndLeave(),
    });

  if (result.distanceKm < MIN_SAVE_DISTANCE_KM) {
    return (
      <Screen>
        <View style={[styles.centered, { paddingBottom: insets.bottom + spacing.lg }]}>
          <AppText variant="title1" accessibilityRole="header">
            {summary.empty.title}
          </AppText>
          <AppText variant="body" color="textSecondary">
            {summary.empty.body}
          </AppText>
          <PrimaryButton label={summary.empty.done} onPress={() => void finishAndLeave()} />
        </View>
      </Screen>
    );
  }

  if (phase === 'queued') {
    return (
      <Screen>
        <View style={[styles.centered, { paddingBottom: insets.bottom + spacing.lg }]}>
          <AppText variant="title1" accessibilityRole="header">
            {summary.queued.title}
          </AppText>
          <AppText variant="body" color="textSecondary">
            {summary.queued.body}
          </AppText>
          <PrimaryButton label={summary.queued.done} onPress={onDone} />
        </View>
      </Screen>
    );
  }

  let treeBlock: { text: string; progress: number } | null = null;
  if (baselineKm !== null) {
    const after = baselineKm + result.distanceKm;
    const earned = kmToTrees(after) - kmToTrees(baselineKm);
    const tree = getTreeProgress(after);
    treeBlock = {
      text: earned > 0 ? summary.treesEarned(earned) : summary.treeRemaining(formatKm(tree.remainingKm)),
      progress: tree.progress,
    };
  }

  const saving = phase === 'saving';
  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        <AppText variant="title1" accessibilityRole="header">
          {summary.title}
        </AppText>

        <View style={styles.typeBlock}>
          <UnderlinedChoice
            options={options}
            selected={type}
            onSelect={setType}
            accessibilityLabel={summary.typeGroup}
          />
          <AppText variant="secondary" color="textSecondary">
            {classification.reliable ? summary.suggested(typeLabel(classification.type).toLowerCase()) : summary.unsure}
          </AppText>
        </View>

        <View style={styles.stats}>
          <Stat label={summary.distance} value={distance} unit={summary.km} a11y={`${summary.distance} ${distance} ${summary.km}`} />
          <Stat label={summary.duration} value={duration} a11y={`${summary.duration} ${duration}`} />
          <Stat label={summary.averagePace} value={pace} unit={summary.paceUnit} a11y={`${summary.averagePace} ${pace} ${summary.paceUnit}`} />
        </View>

        <View style={styles.route}>
          <RouteLine
            points={drawnRoute}
            width={routeWidth}
            height={ROUTE_HEIGHT}
            strokeWidth={ROUTE_STROKE}
            color={colors.primary}
            accessibilityLabel={summary.routeImage}
          />
        </View>

        {treeBlock ? (
          <View style={styles.tree}>
            <TreeRings progress={treeBlock.progress} size={TREE_RING_SIZE} showTip={false} accessibilityLabel={treeBlock.text} />
            <AppText variant="body" style={styles.treeText}>
              {treeBlock.text}
            </AppText>
          </View>
        ) : null}

        {saveError ? (
          <AppText variant="body" color="danger" accessibilityLiveRegion="polite">
            {saveError === 'rejected' ? summary.rejected : summary.saveFailed}
          </AppText>
        ) : null}

        <View style={styles.actions}>
          <PrimaryButton label={saving ? summary.saving : summary.save} onPress={() => void save()} disabled={saving} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={summary.discard}
            disabled={saving}
            onPress={discard}
            style={({ pressed }) => [styles.discard, pressed && styles.pressed]}>
            <AppText variant="title3" color="danger">
              {summary.discard}
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value, unit, a11y }: { label: string; value: string; unit?: string; a11y: string }) {
  return (
    <View accessible accessibilityLabel={a11y} style={styles.stat}>
      <AppText variant="secondary" color="textSecondary" accessibilityElementsHidden>
        {label}
      </AppText>
      <View style={styles.statValue} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <TabularNumber value={value} variant="bigNumber" />
        {unit ? (
          <AppText variant="title3" color="textSecondary">
            {unit}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primary,
        { backgroundColor: pressed || disabled ? colors.primaryPressed : colors.primary },
      ]}>
      <AppText variant="title2" color="onPrimary">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl },
  centered: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  typeBlock: { gap: spacing.xs },
  stats: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.xxl, rowGap: spacing.lg },
  stat: { gap: spacing.xs },
  statValue: { flexDirection: 'row', alignItems: 'baseline', columnGap: spacing.sm },
  route: { marginHorizontal: 0 },
  tree: { flexDirection: 'row', alignItems: 'center', columnGap: spacing.lg },
  treeText: { flex: 1 },
  actions: { gap: spacing.sm },
  primary: {
    height: CTA_HEIGHT,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discard: { minHeight: touch.min, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
});

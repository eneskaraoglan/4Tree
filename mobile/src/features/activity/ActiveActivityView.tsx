import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, TabularNumber } from '@/components/AppText';
import { TreeRings } from '@/components/illustration';
import { RouteLine } from '@/components/RouteLine';
import { Screen } from '@/components/Screen';
import { formatKm, getTreeProgress } from '@/features/run/format';
import { trActivity } from '@/i18n';
import { kmToTrees } from '@/services';
import { colors, screenPadding, spacing, touch } from '@/theme';

import { formatClock, formatDistance } from './format';
import { decimate } from './geo';
import { hapticFinish, hapticPause } from './haptics';
import { FINISH_HOLD_MS } from './layout';
import { MetricBlock } from './MetricBlock';
import { formatPace } from './pace';
import { RunControlButton } from './RunControlButton';
import type { ActivityTracker } from './useActivityTracker';

/** Canlı rota çiziminde en fazla nokta; uzun aktivitelerde çizim akıcı kalsın. */
const MAX_ROUTE_POINTS = 400;
const ROUTE_STROKE = 3;
const TREE_RING_SIZE = 56;
const HINT_VISIBLE_MS = 3000;
const STATUS_HEIGHT = 24;

type Props = {
  tracker: ActivityTracker;
  /** Aktivite öncesi toplam km (profilden); bilinmiyorsa null ve ağaç satırı gizlenir. */
  baselineKm: number | null;
};

function statusText(tracker: ActivityTracker): string | null {
  const { status: s } = trActivity.live;
  if (tracker.error === 'permission') return s.permissionLost;
  if (tracker.status === 'paused') return s.paused;
  if (tracker.error === 'unavailable') return s.unavailable;
  if (tracker.gps === 'searching') return s.searching;
  if (tracker.gps === 'weak') return s.weak;
  if (tracker.gps === 'lost') return s.lost;
  return null;
}

/** Aktif aktivite: büyük süre, mesafe, tempo, canlı rota, ağaç ilerlemesi ve büyük kontroller. */
export function ActiveActivityView({ tracker, baselineKm }: Props) {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const [routeSize, setRouteSize] = useState({ width: 0, height: 0 });
  const [hintVisible, setHintVisible] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    },
    [],
  );

  const paused = tracker.status === 'paused';
  const route = useMemo(() => decimate(tracker.route, MAX_ROUTE_POINTS) as { lat: number; lng: number }[], [tracker.route]);
  const onRouteLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setRouteSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  };

  const time = formatClock(tracker.elapsedSec);
  const distance = formatDistance(tracker.distanceKm);
  const current = formatPace(tracker.currentPace);
  const average = formatPace(tracker.averagePace);
  const { live } = trActivity;
  const status = statusText(tracker);

  let treeLine: { text: string; progress: number; a11y: string } | null = null;
  if (baselineKm !== null) {
    const total = baselineKm + tracker.distanceKm;
    const tree = getTreeProgress(total);
    const earned = kmToTrees(total) - kmToTrees(baselineKm);
    treeLine = {
      text: earned > 0 ? live.treeEarned : live.treeRemaining(formatKm(tree.remainingKm)),
      progress: tree.progress,
      a11y: live.treeRing(formatKm(tree.doneKm), formatKm(tree.remainingKm)),
    };
  }

  const finish = () => {
    hapticFinish();
    tracker.finish();
  };
  const showHint = () => {
    setHintVisible(true);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHintVisible(false), HINT_VISIBLE_MS);
  };

  return (
    <Screen>
      <View accessibilityLabel={live.screenLabel} style={[styles.root, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.status}>
          {status ? (
            <AppText
              variant="body"
              color={tracker.error === 'unavailable' || tracker.error === 'permission' ? 'danger' : 'textSecondary'}
              accessibilityLiveRegion="polite">
              {status}
            </AppText>
          ) : null}
          {tracker.error === 'permission' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={live.openSettings}
              onPress={() => {
                Linking.openSettings().catch(() => {});
              }}
              style={styles.settings}>
              <AppText variant="title3" color="primary">
                {live.openSettings}
              </AppText>
            </Pressable>
          ) : null}
        </View>

        <View accessible accessibilityLabel={live.a11yTimer(time)} accessibilityRole="timer" style={styles.timer}>
          <AppText variant="secondary" color="textSecondary" accessibilityElementsHidden>
            {live.time}
          </AppText>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <TabularNumber value={time} variant="timer" color={paused ? 'textSecondary' : 'text'} />
          </View>
        </View>

        <View style={styles.metrics}>
          <MetricBlock
            label={live.distance}
            value={distance}
            unit={live.km}
            accessibilityLabel={live.a11yDistance(distance)}
          />
          <View style={styles.paces}>
            <MetricBlock
              label={live.currentPace}
              value={current}
              unit={live.paceUnit}
              accessibilityLabel={
                tracker.currentPace === null ? live.a11yNoPace(live.currentPace) : live.a11yPace(live.currentPace, current)
              }
            />
            <MetricBlock
              label={live.averagePace}
              value={average}
              unit={live.paceUnit}
              accessibilityLabel={
                tracker.averagePace === null ? live.a11yNoPace(live.averagePace) : live.a11yPace(live.averagePace, average)
              }
            />
          </View>
        </View>

        <View style={styles.route} onLayout={onRouteLayout} testID="live-route">
          {routeSize.width > 0 ? (
            <RouteLine
              points={route}
              width={routeSize.width}
              height={routeSize.height}
              strokeWidth={ROUTE_STROKE}
              color={colors.primary}
              accessibilityLabel={live.route}
            />
          ) : null}
        </View>

        {treeLine ? (
          <View style={styles.tree}>
            <TreeRings progress={treeLine.progress} size={TREE_RING_SIZE} animated={false} showTip={false} accessibilityLabel={treeLine.a11y} />
            <AppText variant="body" color="textSecondary" style={styles.treeText}>
              {treeLine.text}
            </AppText>
          </View>
        ) : null}

        <View>
          <View style={styles.controls}>
            {paused ? (
              <RunControlButton
                label={live.resume}
                tone="primary"
                style={styles.main}
                onPress={() => {
                  hapticPause();
                  void tracker.resume();
                }}
              />
            ) : (
              <RunControlButton
                label={live.pause}
                tone="neutral"
                style={styles.main}
                onPress={() => {
                  hapticPause();
                  tracker.pause();
                }}
              />
            )}
            <RunControlButton
              label={live.finish}
              tone="danger"
              onPress={showHint}
              onLongPress={finish}
              delayLongPress={FINISH_HOLD_MS}
              accessibilityHint={live.finishA11yHint}
              onAccessibilityAction={finish}
            />
          </View>
          <View style={styles.hint}>
            {hintVisible ? (
              <AppText variant="secondary" color="textSecondary" style={styles.hintText}>
                {live.finishHint}
              </AppText>
            ) : null}
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'space-between', gap: spacing.md },
  status: { minHeight: STATUS_HEIGHT, justifyContent: 'center' },
  settings: { minHeight: touch.min, justifyContent: 'center' },
  timer: { gap: spacing.xs },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', columnGap: spacing.lg, rowGap: spacing.md },
  paces: { gap: spacing.md, alignItems: 'flex-end' },
  // Rota sahnesi kenardan kenara (köşesiz): Screen yan boşluğu geri alınır.
  route: { flex: 1, minHeight: 96, marginHorizontal: -screenPadding, alignItems: 'center', justifyContent: 'center' },
  tree: { flexDirection: 'row', alignItems: 'center', columnGap: spacing.md },
  treeText: { flex: 1 },
  controls: { flexDirection: 'row', columnGap: spacing.md },
  main: { flex: 1 },
  hint: { height: STATUS_HEIGHT, justifyContent: 'center', alignItems: 'center', paddingTop: spacing.xs },
  hintText: { textAlign: 'center' },
});

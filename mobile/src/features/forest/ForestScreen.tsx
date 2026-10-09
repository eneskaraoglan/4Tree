import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { ForestScene, type ForestSceneTree } from '@/components/illustration';
import { forestTr } from '@/i18n';
import { colors, radius, screenPadding, spacing, touch } from '@/theme';

import { ForestStats } from './ForestStats';
import { RegionList } from './RegionList';
import { summarizeRegions } from './regions';
import { toSceneTrees } from './sceneTrees';
import { TreeSheet } from './TreeSheet';
import { useForestTrees } from './useForestTrees';

/** Sahnenin ekran yüksekliğindeki payı (DESIGN.md: yaklaşık %55). Üst güvenli alanın altına taşar. */
const SCENE_RATIO = 0.55;

export function ForestScreen() {
  const { state, reload } = useForestTrees();
  const { height: windowHeight } = useWindowDimensions();
  const sceneHeight = Math.round(windowHeight * SCENE_RATIO);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const trees = useMemo(() => (state.status === 'ready' ? state.trees : []), [state]);
  const sceneTrees = useMemo(() => toSceneTrees(trees), [trees]);
  const regions = useMemo(() => summarizeRegions(trees), [trees]);
  const treeById = useMemo(() => new Map(trees.map((t) => [t.id, t])), [trees]);
  const treeLabel = useCallback(
    (scene: ForestSceneTree) => {
      const tree = treeById.get(scene.id);
      return tree ? forestTr.treeLabel(tree.species, tree.region) : scene.species;
    },
    [treeById],
  );

  const selected = selectedId ? (treeById.get(selectedId) ?? null) : null;

  const handleTreePress = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedId(id);
  }, []);
  const handleDismiss = useCallback(() => setSelectedId(null), []);

  if (state.status !== 'ready') {
    return (
      <ScrollView bounces={false} overScrollMode="never" style={styles.root} contentContainerStyle={styles.content}>
        <View
          accessibilityRole={state.status === 'loading' ? 'progressbar' : undefined}
          accessibilityLabel={state.status === 'loading' ? forestTr.sceneLoadingLabel : undefined}
          accessibilityState={state.status === 'loading' ? { busy: true } : undefined}
          accessible={state.status === 'loading'}
          style={[styles.frame, { height: sceneHeight }]}
        />
        {state.status === 'error' ? (
          <View style={styles.section}>
            <AppText variant="body">{forestTr.error.message}</AppText>
            <Pressable
              accessibilityRole="button"
              onPress={reload}
              style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}>
              <AppText variant="title3" color="onPrimary">
                {forestTr.error.retry}
              </AppText>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView bounces={false} overScrollMode="never" style={styles.root} contentContainerStyle={styles.content}>
        <ForestScene
          trees={sceneTrees}
          height={sceneHeight}
          onTreePress={handleTreePress}
          accessibilityLabel={trees.length === 0 ? forestTr.sceneEmptyLabel : undefined}
          treeAccessibilityLabel={treeLabel}
        />
        <View style={styles.section}>
          <ForestStats treeCount={trees.length} />
          {trees.length === 0 ? (
            <AppText variant="body" color="textSecondary">
              {forestTr.empty}
            </AppText>
          ) : (
            <RegionList regions={regions} />
          )}
        </View>
      </ScrollView>
      {selected ? <TreeSheet key={selected.id} tree={selected} onDismiss={handleDismiss} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingBottom: spacing.xxxl },
  frame: { alignSelf: 'stretch', backgroundColor: colors.surface },
  section: { paddingHorizontal: screenPadding, paddingTop: spacing.xxl, gap: spacing.xxl },
  retry: {
    alignSelf: 'flex-start',
    minHeight: touch.min + spacing.sm,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryPressed: { backgroundColor: colors.primaryPressed },
});

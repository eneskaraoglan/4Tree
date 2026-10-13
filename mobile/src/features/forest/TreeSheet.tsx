import { useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { focusAccessibility } from '@/components/accessibilityFocus';
import { AppText } from '@/components/AppText';
import { Tree } from '@/components/illustration';
import { forestTr } from '@/i18n';
import { colors, radius, screenPadding, spacing, touch, typography } from '@/theme';
import type { ForestTree } from '@/types';

import { formatPlantedDate } from './format';
import { SampleTag } from './SampleTag';
import { toSceneTree } from './sceneTrees';
import { OPEN_MS, useSheetMotion } from './useSheetMotion';

const TREE_SIZE = 168;

type Props = {
  tree: ForestTree;
  /** Kapanış animasyonu bittikten sonra çağrılır; üst bileşen sheet'i kaldırır. */
  onDismiss: () => void;
};

/** Ağaç ayrıntısı: aşağıdan çıkan sheet. Arka plana dokun, aşağı kaydır, Kapat ya da geri tuşuyla kapanır. */
export function TreeSheet({ tree, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const sceneTree = useMemo(() => toSceneTree(tree), [tree]);
  const date = formatPlantedDate(tree.plantedAt);
  const { backdropStyle, sheetStyle, panHandlers, requestClose, windowHeight, reduceMotion } = useSheetMotion(onDismiss);
  const titleRef = useRef<Text>(null);

  // Açılışta odak sheet başlığına gider (ekran okuyucu); kayma bittikten sonra.
  useEffect(() => {
    const timer = setTimeout(() => focusAccessibility(titleRef.current), reduceMotion ? 0 : OPEN_MS + 60);
    return () => clearTimeout(timer);
  }, [reduceMotion]);

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={requestClose}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={requestClose} testID="sheet-backdrop" />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          onAccessibilityEscape={requestClose}
          style={[styles.sheet, { maxHeight: windowHeight * 0.9, paddingBottom: insets.bottom + spacing.md }, sheetStyle]}>
          <View {...panHandlers} style={styles.dragZone}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text ref={titleRef} accessibilityRole="header" style={styles.title}>
                  {tree.species}
                </Text>
                <AppText variant="secondary" color="textSecondary">
                  {tree.region}
                </AppText>
              </View>
              <Tree
                species={sceneTree.species}
                seed={sceneTree.seed}
                size={TREE_SIZE}
                growIn
                accessibilityLabel={forestTr.sheet.treeImage(tree.species)}
              />
            </View>
          </View>
          <ScrollView bounces={false} contentContainerStyle={styles.body}>
            <View style={styles.certificate}>
              <AppText variant="body">{forestTr.sheet.certificateLine(date, tree.certificateNo)}</AppText>
              <SampleTag label={forestTr.sheet.sampleCertificate} />
            </View>
            {tree.sponsor ? (
              <AppText variant="secondary" color="textSecondary">
                {forestTr.sheet.sponsor(tree.sponsor)}
              </AppText>
            ) : null}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={forestTr.sheet.close}
            onPress={requestClose}
            style={({ pressed }) => [styles.close, pressed && styles.closePressed]}>
            <AppText variant="title3">{forestTr.sheet.close}</AppText>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: colors.canvas },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: screenPadding,
  },
  dragZone: { paddingTop: spacing.sm },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.divider,
    marginBottom: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  title: { ...typography.title1, color: colors.text },
  headerText: { flex: 1, paddingBottom: spacing.sm, gap: spacing.xs },
  body: { gap: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  certificate: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: spacing.md, rowGap: spacing.xs },
  close: {
    minHeight: touch.min + spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePressed: { opacity: 0.8 },
});

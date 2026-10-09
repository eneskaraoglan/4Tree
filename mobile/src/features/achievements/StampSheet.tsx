import { useEffect, useRef } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { achievements } from '@/i18n';
import { colors, radius, screenPadding, spacing, touch } from '@/theme';
import type { Badge } from '@/types';

import { focusAccessibility } from './focusAccessibility';
import { formatLongDate } from './formatBadgeDate';
import { PostageStamp } from './PostageStamp';

type Props = {
  badge: Badge | null;
  visible: boolean;
  onClose: () => void;
};

const MAX_STAMP_WIDTH = 240;
const OPEN_SCALE_FROM = 0.86;
const OPEN_MS = 240;
/** Sheet en çok ekranın bu kadarını kaplar; fazlası kaydırılır, "Kapat" sabit kalır. */
const MAX_SHEET_RATIO = 0.85;
/** Ekran okuyucu odağı, sheet çizildikten kısa süre sonra içeriğe verilir. */
const FOCUS_DELAY_MS = 120;

function SheetBody({ badge, onClose }: { badge: Badge; onClose: () => void }) {
  const reduceMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(reduceMotion ? 1 : OPEN_SCALE_FROM);
  const focusRef = useRef<View>(null);

  useEffect(() => {
    if (!reduceMotion) scale.value = withTiming(1, { duration: OPEN_MS, easing: Easing.out(Easing.cubic) });
  }, [reduceMotion, scale]);

  // Sheet açılınca ekran okuyucu odağı arka plana değil, pulun açıklamasına gider.
  useEffect(() => {
    const timer = setTimeout(() => focusAccessibility(focusRef.current), FOCUS_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const grow = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const stampWidth = Math.min(MAX_STAMP_WIDTH, Math.round(width * 0.62));
  const earnedDate = formatLongDate(badge.earnedAt);
  const lines = badge.earned
    ? [badge.description, earnedDate ? achievements.sheet.earnedOn(earnedDate) : null]
    : [achievements.sheet.howTo(badge.description)];

  return (
    <View
      accessibilityViewIsModal
      style={[styles.sheet, { maxHeight: height * MAX_SHEET_RATIO, paddingBottom: spacing.md + insets.bottom }]}
      testID="stamp-sheet">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.stamp, grow]}>
          <PostageStamp ref={focusRef} badge={badge} width={stampWidth} />
        </Animated.View>
        <View style={styles.texts}>
          {lines.map((line) =>
            line ? (
              <AppText key={line} variant="body" color="textSecondary" style={styles.line}>
                {line}
              </AppText>
            ) : null,
          )}
        </View>
      </ScrollView>
      <Pressable accessibilityRole="button" onPress={onClose} style={styles.close} hitSlop={spacing.sm}>
        <AppText variant="title3" color="text">
          {achievements.sheet.close}
        </AppText>
      </Pressable>
    </View>
  );
}

/** Yerel alt sheet: dokunulan pul büyür, açıklaması ve kazanma tarihi (ya da nasıl kazanılacağı) görünür. */
export function StampSheet({ badge, visible, onClose }: Props) {
  const reduceMotion = useReducedMotion();
  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
      statusBarTranslucent
      testID="stamp-modal">
      <View style={styles.root}>
        {/* Arka plan sadece dokunarak kapatma içindir; ekran okuyucuya görünmez (kapatma "Kapat" düğmesi ve geri tuşuyla). */}
        <Pressable
          accessible={false}
          importantForAccessibility="no"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
          testID="stamp-backdrop">
          <View style={styles.backdrop} />
        </Pressable>
        {badge ? <SheetBody badge={badge} onClose={onClose} /> : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: colors.canvas, opacity: 0.82 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: screenPadding,
    paddingTop: spacing.xxxl,
    alignItems: 'center',
  },
  scroll: { flexGrow: 0, flexShrink: 1, alignSelf: 'stretch' },
  scrollContent: { alignItems: 'center' },
  stamp: { marginBottom: spacing.xl },
  texts: { alignSelf: 'stretch', rowGap: spacing.xs },
  line: { textAlign: 'center' },
  close: {
    marginTop: spacing.md,
    minHeight: touch.min,
    minWidth: touch.min,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

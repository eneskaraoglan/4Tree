import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type AccessibilityActionEvent,
  type GestureResponderEvent,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { useMotionEnabled } from '@/components/illustration/useMotionEnabled';
import { trFeed } from '@/i18n';
import { colors, spacing, touch } from '@/theme';
import type { ReactionCounts, ReactionType } from '@/types';

import { hapticOpen, hapticSelect, hapticTap } from './haptics';
import { REACTION_MOTION, REACTION_SIZES, type ReactionBarSize } from './layout';
import { fallbackAnchor, pickerFrame, reactionIndexAt, type Anchor } from './pickerGeometry';
import { ReactionPicker } from './ReactionPicker';
import { ReactionSummary } from './ReactionSummary';
import { DEFAULT_REACTION, orderReactions, REACTION_TYPES, REACTIONS } from './reactions';

export type ReactionBarProps = {
  /** Türe göre tepki sayıları (kullanıcının kendi tepkisi dahil). */
  counts: ReactionCounts;
  /** Kullanıcının tepkisi; yoksa null. */
  mine: ReactionType | null;
  /** null: geri alındı. Hata dönüşü ve kuyruk üst bileşenin (örn. useFeed) işidir. */
  onChange: (reaction: ReactionType | null) => void;
  /** Seçicide gösterilen türler; verilmezse hepsi. */
  supported?: readonly ReactionType[];
  /** md: gönderi, sm: yorum. */
  size?: ReactionBarSize;
  testID?: string;
};

const REMOVE_ACTION = 'remove';

function bounce(value: SharedValue<number>): void {
  value.value = withSequence(
    withTiming(REACTION_MOTION.bounceScale, { duration: REACTION_MOTION.bounceUpMs, easing: Easing.out(Easing.cubic) }),
    withTiming(1, { duration: REACTION_MOTION.bounceDownMs }),
  );
}

/**
 * Tek konumlu tepki: solda tek düğme, sağda özet. Dokun: tepkin yoksa Su ver, varsa geri al.
 * Basılı tut: düğmenin üstünde hap açılır; parmak kaydırılarak ya da dokunarak seçilir.
 * Kişi başına tek tepki: yeni seçim öncekinin yerine geçer. Gönderiden bağımsızdır (yorumlarda da kullanılır).
 */
export function ReactionBar({ counts, mine, onChange, supported, size = 'md', testID = 'reaction-bar' }: ReactionBarProps) {
  const options = orderReactions(supported ?? REACTION_TYPES);
  const metrics = REACTION_SIZES[size];
  const motion = useMotionEnabled(true);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const scale = useSharedValue(1);
  const anchorRef = useRef<View>(null);

  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  // Dokunma olayları render beklemeden okunur.
  const openRef = useRef(false);
  const hoveredRef = useRef<number | null>(null);

  // Çıkışta süren sıçrama durdurulur.
  useEffect(() => () => cancelAnimation(scale), [scale]);

  const shown = mine ? REACTIONS[mine] : REACTIONS[DEFAULT_REACTION];
  const tint = mine ? shown.color : 'textSecondary';
  const frame = pickerFrame(anchor ?? fallbackAnchor(windowHeight), options.length, windowWidth);

  const setHover = (next: number | null) => {
    hoveredRef.current = next;
    setHovered(next);
  };

  const close = () => {
    openRef.current = false;
    setOpen(false);
    setHover(null);
    setAnchor(null);
  };

  /** Kullanıcı yeni bir tepki verdi ya da değiştirdi: sıçrar (geri almada, hata dönüşünde ve dışarıdan değişimde yok). */
  const give = (reaction: ReactionType) => {
    if (motion) bounce(scale);
    onChange(reaction);
  };

  const handlePress = () => {
    hapticTap();
    if (mine) {
      onChange(null);
      return;
    }
    const first = options.includes(DEFAULT_REACTION) ? DEFAULT_REACTION : options[0];
    if (first) give(first);
  };

  const handleLongPress = () => {
    if (options.length === 0) return;
    hapticOpen();
    openRef.current = true;
    setHover(null);
    setOpen(true);
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      if (openRef.current) setAnchor({ x, y, width, height });
    });
  };

  const select = (reaction: ReactionType) => {
    close();
    // Zaten seçili olanı seçmek değişiklik değildir; geri almak için düğmeye dokunulur.
    if (reaction === mine) return;
    hapticSelect();
    give(reaction);
  };

  // Parmak basılı tutulurken kaydırılırsa dokunma, düğmenin kendi görünümünde sürer (hap ayrı bir pencerede).
  const handleTouchMove = (event: GestureResponderEvent) => {
    if (!openRef.current) return;
    const { pageX, pageY } = event.nativeEvent;
    const next = reactionIndexAt(frame, options.length, pageX, pageY);
    if (next === hoveredRef.current) return;
    if (next !== null) hapticSelect();
    setHover(next);
  };

  const handleTouchEnd = () => {
    if (!openRef.current) return;
    const index = hoveredRef.current;
    // Parmak bir seçenekteyken kalktıysa seçilir; değilse hap açık kalır ve dokunarak seçilir.
    if (index !== null && options[index]) select(options[index]);
  };

  const actions = [
    ...options.map((type) => ({ name: type, label: REACTIONS[type].label })),
    ...(mine ? [{ name: REMOVE_ACTION, label: trFeed.reactions.remove }] : []),
  ];

  const handleAction = (event: AccessibilityActionEvent) => {
    const name = event.nativeEvent.actionName;
    if (name === REMOVE_ACTION) {
      if (mine) onChange(null);
      return;
    }
    const type = options.find((option) => option === name);
    if (type && type !== mine) give(type);
  };

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={styles.row} testID={testID}>
      <View
        ref={anchorRef}
        collapsable={false}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        testID={`${testID}-touch`}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={mine ? trFeed.reactions.mine(shown.label) : trFeed.reactions.give}
          accessibilityHint={trFeed.reactions.giveHint}
          accessibilityState={{ selected: mine !== null }}
          accessibilityActions={actions}
          onAccessibilityAction={handleAction}
          delayLongPress={REACTION_MOTION.longPressMs}
          onPress={handlePress}
          onLongPress={handleLongPress}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          testID={`${testID}-button`}>
          <View
            style={[
              styles.pebble,
              { width: metrics.pebble, height: metrics.pebble, borderRadius: metrics.pebble / 2 },
              mine !== null && styles.pebbleActive,
            ]}>
            <Animated.View style={iconStyle}>
              <shown.Icon size={metrics.icon} color={colors[tint]} active={mine !== null} />
            </Animated.View>
          </View>
          <AppText variant="secondary" color={tint}>
            {shown.label}
          </AppText>
        </Pressable>
      </View>
      <View style={styles.spacer} />
      <ReactionSummary counts={counts} size={size} testID={`${testID}-summary`} />
      <ReactionPicker
        visible={open}
        frame={frame}
        options={options}
        mine={mine}
        hoveredIndex={hovered}
        onSelect={select}
        onClose={close}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  spacer: { flex: 1, minWidth: spacing.md },
  button: {
    minHeight: touch.min,
    minWidth: touch.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  pressed: { opacity: 0.7 },
  pebble: { alignItems: 'center', justifyContent: 'center' },
  pebbleActive: { backgroundColor: colors.surface2 },
});

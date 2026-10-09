import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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

import { hapticReaction } from './haptics';
import { REACTION } from './layout';

export type ReactionKind = 'clap' | 'water';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const KINDS = {
  clap: {
    copy: trFeed.reactions.clap,
    icon: 'hand-clap' as IconName,
    iconActive: 'hand-clap' as IconName,
    color: 'gold' as const,
  },
  water: {
    copy: trFeed.reactions.water,
    icon: 'water-outline' as IconName,
    iconActive: 'water' as IconName,
    color: 'water' as const,
  },
};

function bounce(value: SharedValue<number>): void {
  value.value = withSequence(
    withTiming(REACTION.bounceScale, { duration: REACTION.bounceUpMs, easing: Easing.out(Easing.cubic) }),
    withTiming(1, { duration: REACTION.bounceDownMs }),
  );
}

type Props = {
  kind: ReactionKind;
  active: boolean;
  count: number;
  onPress: () => void;
};

/** İkon + metin + sayı. Aktifken ikon renkli/dolu ve altında yosun renginde bir "taş" durur. */
export function ReactionButton({ kind, active, count, onPress }: Props) {
  const config = KINDS[kind];
  const motion = useMotionEnabled(true);
  const scale = useSharedValue(1);
  const tint = active ? config.color : 'textSecondary';

  // Çıkışta süren sıçrama durdurulur.
  useEffect(() => () => cancelAnimation(scale), [scale]);

  const handlePress = () => {
    hapticReaction();
    // Sıçrama yalnız kullanıcı dokunuşuyla ve verirken olur; geri alma, hata dönüşü ve çek-yenilede olmaz.
    // Reduce Motion açıksa statik.
    if (motion && !active) {
      bounce(scale);
    }
    onPress();
  };

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={config.copy.a11y(count, active)}
      accessibilityState={{ selected: active }}
      onPress={handlePress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      testID={`reaction-${kind}`}>
      <View style={[styles.pebble, active && styles.pebbleActive]}>
        <Animated.View style={iconStyle}>
          <MaterialCommunityIcons
            name={active ? config.iconActive : config.icon}
            size={REACTION.iconSize}
            color={colors[tint]}
          />
        </Animated.View>
      </View>
      <AppText variant="secondary" color={tint}>
        {config.copy.label}
      </AppText>
      {count > 0 ? (
        <AppText variant="secondary" color={tint} style={styles.count}>
          {count}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: touch.min,
    minWidth: touch.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingRight: spacing.md,
  },
  pressed: { opacity: 0.7 },
  pebble: {
    width: REACTION.pebbleSize,
    height: REACTION.pebbleSize,
    borderRadius: REACTION.pebbleSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pebbleActive: { backgroundColor: colors.surface2 },
  count: { fontVariant: ['tabular-nums'] },
});

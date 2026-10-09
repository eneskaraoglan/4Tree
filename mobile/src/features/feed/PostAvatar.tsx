import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AppText } from '@/components/AppText';
import { createRng, hashString } from '@/components/illustration/random';
import { closedShapePath, wobblyEllipse } from '@/components/illustration/shapes';
import { colors } from '@/theme';

import { AVATAR_SIZE } from './layout';

/** Koyu (onPrimary) harfin AA verdiği dolgular; parlak yeşil ekran vurgusu için ayrıldı. */
const FILLS = [colors.gold, colors.water, colors.textSecondary, colors.bark] as const;

const POINT_COUNT = 9;
const JITTER = 0.12;

/** Aynı addan her zaman aynı renk ve aynı hafif organik biçim. */
export function postAvatarGeometry(name: string, size: number): { path: string; fill: string } {
  const seed = hashString(name.trim().toLocaleLowerCase('tr'));
  const rng = createRng(seed + 11);
  const center = size / 2;
  const radius = center / (1 + JITTER) - 0.5;
  const pts = wobblyEllipse(rng, center, center, radius, radius, POINT_COUNT, JITTER);
  return { path: closedShapePath(pts, center, center, 1, true), fill: FILLS[seed % FILLS.length] };
}

type Props = { name: string; initial: string; size?: number };

/** Gönderi sahibinin harfli, taş gibi hafif düzensiz avatarı. Ad yanında yazıldığı için ekran okuyucudan gizlenir. */
export function PostAvatar({ name, initial, size = AVATAR_SIZE }: Props) {
  const { path, fill } = postAvatarGeometry(name, size);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size }}
      testID="post-avatar">
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Path d={path} fill={fill} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.letter]}>
        <AppText variant="title3" color="onPrimary">
          {initial.slice(0, 1).toLocaleUpperCase('tr')}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  letter: { alignItems: 'center', justifyContent: 'center' },
});

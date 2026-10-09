import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { createRng, hashString } from '@/components/illustration/random';
import { closedShapePath, wobblyEllipse } from '@/components/illustration/shapes';
import { colors } from '@/theme';

import { CONTOUR_OPACITY, CONTOUR_STROKE } from './layout';

const POINT_COUNT = 10;
const JITTER = 0.16;

/**
 * Gönderi id'sinden tohumlu, iç içe 3-4 düzensiz kapalı eğri (topografik kontur).
 * Aynı id her zaman aynı çizimi verir.
 */
export function contourPaths(postId: string, width: number, height: number): string[] {
  if (!(width > 0) || !(height > 0)) return [];
  const seed = hashString(postId);
  const rng = createRng(seed + 31);
  const count = 3 + (seed % 2);
  const cx = width * (0.25 + 0.5 * rng());
  const cy = height * (0.3 + 0.4 * rng());
  return Array.from({ length: count }, (_, i) => {
    const rx = width * (0.12 + i * 0.13) * (0.9 + rng() * 0.2);
    const ry = height * (0.18 + i * 0.2) * (0.9 + rng() * 0.2);
    // Halkalar tam eşmerkezli olmasın: her kontur merkezden hafifçe kayar.
    const ox = (rng() - 0.5) * width * 0.04;
    const oy = (rng() - 0.5) * height * 0.06;
    const pts = wobblyEllipse(rng, cx + ox, cy + oy, rx, ry, POINT_COUNT, JITTER);
    return closedShapePath(pts, cx + ox, cy + oy, 1, true);
  });
}

type Props = { postId: string; width: number; height: number };

/** Rota alanının arkasında duran çok soluk, elle çizilmiş gibi kontur çizgileri. Süstür, ekran okuyucudan gizlenir. */
function RouteContoursBase({ postId, width, height }: Props) {
  const paths = useMemo(() => contourPaths(postId, width, height), [postId, width, height]);
  if (paths.length === 0) return null;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      testID="route-contours">
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {paths.map((d, i) => (
          <Path
            key={i}
            d={d}
            fill="none"
            stroke={colors.divider}
            strokeWidth={CONTOUR_STROKE}
            strokeOpacity={CONTOUR_OPACITY}
            strokeLinejoin="round"
            testID="route-contour"
          />
        ))}
      </Svg>
    </View>
  );
}

export const RouteContours = memo(RouteContoursBase);

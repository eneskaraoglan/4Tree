import { memo, useEffect, useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/theme';

import { clamp01 } from './random';
import { buildRingsGeometry, RING_VIEWBOX, tipPosition, type RingsGeometry } from './ringGeometry';
import { useMotionEnabled } from './useMotionEnabled';
import { windowProgress } from './shapes';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const DEFAULT_RINGS = 9;
const DEFAULT_HOLE_RATIO = 0.46;
const DEFAULT_SEED = 4;
/** Açılış çizimi süresi (DESIGN.md: en fazla 900 ms). */
export const RING_INTRO_MS = 860;
const TIP_RADIUS = 1.9;
const TIP_HALO_RADIUS = 4.6;

export type TreeRingsProps = {
  /** 0-1; aralık dışı değerler kırpılır. Her halka 1 / rings kadar ilerlemedir. */
  progress: number;
  /** Kare kenar uzunluğu (dp). */
  size: number;
  /** Merkezdeki boşluğa konur (sayaç, etiket). */
  children?: ReactNode;
  /** İlk gösterimde içten dışa çizim; sistemde "Hareketi azalt" açıksa kapalıdır. Varsayılan true. */
  animated?: boolean;
  /** Ekran okuyucu etiketi (i18n'den gelmeli). */
  accessibilityLabel?: string;
  /** Halka sayısı. Varsayılan 9. */
  rings?: number;
  /** Merkez boşluğunun çapı / size. Varsayılan 0.46. */
  holeRatio?: number;
  /** İlerleme ucunda ışıklı nokta. Varsayılan true. */
  showTip?: boolean;
  /** Çizim tohumu; aynı tohum aynı halkaları verir. */
  seed?: number;
};

type LayerProps = {
  geometry: RingsGeometry;
  progress: number;
  showTip: boolean;
};

/** Küçük kopukluk için dash deseni: [çizgi, boşluk, çizgi, 0]. Toplamı halka uzunluğudur. */
function gapDash(length: number, gap: readonly [number, number]) {
  const first = length * gap[0];
  const hole = length * gap[1];
  return [first, hole, Math.max(0, length - first - hole), 0];
}

/** Soluk, her zaman görünen halkalar: tahtadaki damarlar, kabuk dokusu ve öz. */
function BaseRings({ geometry }: { geometry: RingsGeometry }) {
  return (
    <>
      <Path d={geometry.pith} fill={colors.surface} fillOpacity={0.85} />
      {geometry.rings.map((ring, k) => (
        <Path
          key={k}
          d={ring.d}
          fill="none"
          stroke={colors.bark}
          strokeOpacity={0.3}
          strokeWidth={ring.strokeWidth}
          strokeLinejoin="round"
          strokeDasharray={ring.gap ? gapDash(ring.length, ring.gap) : undefined}
        />
      ))}
      <Path d={geometry.rim} fill="none" stroke={colors.bark} strokeOpacity={0.6} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d={geometry.bark} fill="none" stroke={colors.bark} strokeOpacity={0.5} strokeWidth={0.35} strokeLinecap="round" />
    </>
  );
}

function fillOpacityFor(k: number, count: number) {
  return 0.5 + 0.5 * ((k + 1) / count);
}

/** Animasyonsuz: son hal doğrudan çizilir. */
function StaticFill({ geometry, progress, showTip }: LayerProps) {
  const count = geometry.rings.length;
  const tip = showTip ? tipPosition(geometry.table, geometry.samples, count, progress) : null;
  return (
    <>
      {geometry.rings.map((ring, k) => {
        const fill = clamp01(progress * count - k);
        if (fill <= 0.001) return null;
        return (
          <Path
            key={k}
            d={ring.d}
            fill="none"
            stroke={colors.primary}
            strokeOpacity={fillOpacityFor(k, count)}
            strokeWidth={ring.fillWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={fill >= 0.999 ? undefined : [ring.length, ring.length]}
            strokeDashoffset={fill >= 0.999 ? undefined : ring.length * (1 - fill)}
          />
        );
      })}
      {tip ? (
        <>
          <Circle cx={tip[0]} cy={tip[1]} r={TIP_HALO_RADIUS} fill={colors.primaryGlow} />
          <Circle cx={tip[0]} cy={tip[1]} r={TIP_RADIUS} fill={colors.primary} />
        </>
      ) : null}
    </>
  );
}

type FillRingProps = {
  d: string;
  length: number;
  strokeWidth: number;
  index: number;
  count: number;
  progress: SharedValue<number>;
  intro: SharedValue<number>;
};

/** Tek halka: içten dışa kayan zaman penceresinde dash ile çizilir. */
function AnimatedFillRing({ d, length, strokeWidth, index, count, progress, intro }: FillRingProps) {
  const start = (index / count) * 0.55;
  const end = start + 0.45;
  const animatedProps = useAnimatedProps(() => {
    const fill = Math.min(1, Math.max(0, progress.value * count - index));
    const local = windowProgress(intro.value, start, end);
    const eased = 1 - (1 - local) * (1 - local) * (1 - local);
    const drawn = fill * eased;
    return { strokeDashoffset: length * (1 - drawn), opacity: drawn > 0.002 ? 1 : 0 };
  });
  return (
    <AnimatedPath
      d={d}
      fill="none"
      stroke={colors.primary}
      strokeOpacity={fillOpacityFor(index, count)}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={[length, length]}
      animatedProps={animatedProps}
    />
  );
}

type TipProps = {
  geometry: RingsGeometry;
  progress: SharedValue<number>;
  intro: SharedValue<number>;
  radius: number;
  fill: string;
};

function AnimatedTipDot({ geometry, progress, intro, radius, fill }: TipProps) {
  const { table, samples } = geometry;
  const count = geometry.rings.length;
  const animatedProps = useAnimatedProps(() => {
    const tip = tipPosition(table, samples, count, progress.value);
    const visible = tip ? windowProgress(intro.value, 0.72, 1) : 0;
    return { cx: tip ? tip[0] : 50, cy: tip ? tip[1] : 50, opacity: visible };
  });
  return <AnimatedCircle r={radius} fill={fill} animatedProps={animatedProps} />;
}

/** Açılışta içten dışa çizim; progress değişince yeni değere yumuşakça akar. */
function AnimatedFill({ geometry, progress, showTip }: LayerProps) {
  const count = geometry.rings.length;
  const progressValue = useSharedValue(progress);
  const intro = useSharedValue(0);

  useEffect(() => {
    intro.value = withTiming(1, { duration: RING_INTRO_MS, easing: Easing.linear });
  }, [intro]);

  useEffect(() => {
    progressValue.value = withTiming(progress, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [progress, progressValue]);

  return (
    <>
      {geometry.rings.map((ring, k) => (
        <AnimatedFillRing
          key={k}
          d={ring.d}
          length={ring.length}
          strokeWidth={ring.fillWidth}
          index={k}
          count={count}
          progress={progressValue}
          intro={intro}
        />
      ))}
      {showTip ? (
        <>
          <AnimatedTipDot geometry={geometry} progress={progressValue} intro={intro} radius={TIP_HALO_RADIUS} fill={colors.primaryGlow} />
          <AnimatedTipDot geometry={geometry} progress={progressValue} intro={intro} radius={TIP_RADIUS} fill={colors.primary} />
        </>
      ) : null}
    </>
  );
}

/**
 * 4Tree'nin imzası: ağaç halkası kesiti. İlerleme, içten dışa dolan elle çizilmiş halkalardır.
 * Tek kök SVG; merkez boşluğa `children` konur.
 */
function TreeRingsBase({
  progress,
  size,
  children,
  animated = true,
  accessibilityLabel,
  rings = DEFAULT_RINGS,
  holeRatio = DEFAULT_HOLE_RATIO,
  showTip = true,
  seed = DEFAULT_SEED,
}: TreeRingsProps) {
  const safeProgress = clamp01(progress);
  const motion = useMotionEnabled(animated);
  const count = Math.max(1, Math.round(rings));
  const geometry = useMemo(() => buildRingsGeometry({ count, holeRatio, seed }), [count, holeRatio, seed]);
  const hole = size * holeRatio;

  return (
    <View style={{ width: size, height: size }}>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(safeProgress * 100) }}
        style={StyleSheet.absoluteFill}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${RING_VIEWBOX} ${RING_VIEWBOX}`}>
          <BaseRings geometry={geometry} />
          {motion ? (
            <AnimatedFill geometry={geometry} progress={safeProgress} showTip={showTip} />
          ) : (
            <StaticFill geometry={geometry} progress={safeProgress} showTip={showTip} />
          )}
          <Path d={geometry.crack} fill="none" stroke={colors.canvas} strokeOpacity={0.85} strokeWidth={0.65} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
      {children ? (
        <View pointerEvents="box-none" style={styles.centerWrap}>
          <View pointerEvents="box-none" style={[styles.center, { width: hole, height: hole }]}>
            {children}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export const TreeRings = memo(TreeRingsBase);

const styles = StyleSheet.create({
  centerWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
});

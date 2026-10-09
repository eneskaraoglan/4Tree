import { memo, useEffect, useMemo } from 'react';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Ellipse, Path } from 'react-native-svg';

import { colors } from '@/theme';

import { createRng } from './random';
import { closedShapePath, windowProgress } from './shapes';
import {
  buildTree,
  TREE_VIEWBOX,
  type FoliagePart,
  type StrokePart,
  type TreeShape,
  type TreeSpecies,
} from './treeGeometry';
import { useMotionEnabled } from './useMotionEnabled';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Büyüme animasyonunun toplam süresi (ms). Sıra: gövde, dallar, yapraklar. */
export const TREE_GROW_MS = 1700;
/** Sallanma genliği (derece): açı -SWAY_DEGREES ile +SWAY_DEGREES arasında simetrik gider gelir. */
export const SWAY_DEGREES = 1.5;
/** Tam sallanma döngüsünün süre aralığı (ms): DESIGN.md "4-6 sn". Tohuma göre seçilir. */
export const SWAY_PERIOD_MIN_MS = 4000;
export const SWAY_PERIOD_MAX_MS = 6000;

/** Yapraklar yaylanarak açılır: hedefi biraz aşıp yerine oturur. */
const leafSpring = Easing.out(Easing.back(2.2));

export type TreeProps = {
  species: TreeSpecies;
  /** Kare kutunun kenarı (dp). Ağaç kutunun altına, ortaya oturur. */
  size: number;
  /** Aynı tohum aynı ağacı verir; farklı tohum eğim, boyut, ton ve sonbahar vurgusunu değiştirir. */
  seed: number;
  /** Çok hafif sallanma (±1.5°, 4-6 sn). Varsayılan true; "Hareketi azalt"ta kapalı. */
  swaying?: boolean;
  /** Gövde çizilir, dallar sırayla uzar, yapraklar yaylanarak açılır. Varsayılan false. */
  growIn?: boolean;
  /** Uzaklık sisi (0-1): renkleri ufuk ışığına doğru solgunlaştırır. Orman sahnesi kullanır. */
  haze?: number;
  /** Verilirse ağaç ekran okuyucuya görünür; verilmezse süs sayılır. */
  accessibilityLabel?: string;
};

function Ground() {
  return <Ellipse cx={50} cy={98} rx={17} ry={2.4} fill={colors.canvas} fillOpacity={0.3} />;
}

/** Animasyonsuz ağaç: tek odun yolu + yaprak öbekleri. */
function StaticTree({ shape }: { shape: TreeShape }) {
  return (
    <>
      <Ground />
      <Path d={shape.woodPath} fill={shape.woodFill} stroke={shape.woodFill} strokeWidth={0.6} strokeLinejoin="round" />
      {shape.foliage.map((leaf, i) => (
        <Path
          key={i}
          d={leaf.d}
          fill={leaf.fill}
          fillOpacity={leaf.opacity}
          stroke={leaf.joinWidth > 0 ? leaf.fill : undefined}
          strokeOpacity={leaf.opacity}
          strokeWidth={leaf.joinWidth}
          strokeLinejoin="round"
        />
      ))}
    </>
  );
}

function GrowingStroke({ part, fill, grow }: { part: StrokePart; fill: string; grow: SharedValue<number> }) {
  const [start, end] = part.window;
  const length = part.length;
  const animatedProps = useAnimatedProps(() => {
    const local = windowProgress(grow.value, start, end);
    return { strokeDashoffset: length * (1 - local), opacity: local > 0 ? 1 : 0 };
  });
  return (
    <AnimatedPath
      d={part.d}
      fill="none"
      stroke={fill}
      strokeWidth={part.width}
      strokeLinecap="round"
      strokeDasharray={[length, length]}
      animatedProps={animatedProps}
    />
  );
}

function GrowingLeaf({ leaf, grow }: { leaf: FoliagePart; grow: SharedValue<number> }) {
  const [start, end] = leaf.window;
  const { pts, cx, cy, smooth } = leaf;
  const animatedProps = useAnimatedProps(() => {
    const local = windowProgress(grow.value, start, end);
    const scale = local > 0 ? leafSpring(local) : 0;
    return { d: closedShapePath(pts, cx, cy, scale, smooth), opacity: local > 0 ? 1 : 0 };
  });
  return (
    <AnimatedPath
      fill={leaf.fill}
      fillOpacity={leaf.opacity}
      stroke={leaf.joinWidth > 0 ? leaf.fill : undefined}
      strokeOpacity={leaf.opacity}
      strokeWidth={leaf.joinWidth}
      strokeLinejoin="round"
      animatedProps={animatedProps}
    />
  );
}

function GrowingTree({ shape }: { shape: TreeShape }) {
  const grow = useSharedValue(0);
  useEffect(() => {
    grow.value = withTiming(1, { duration: TREE_GROW_MS, easing: Easing.linear });
  }, [grow]);
  return (
    <>
      <Ground />
      {shape.strokes.map((part, i) => (
        <GrowingStroke key={`s${i}`} part={part} fill={shape.woodFill} grow={grow} />
      ))}
      {shape.foliage.map((leaf, i) => (
        <GrowingLeaf key={`l${i}`} leaf={leaf} grow={grow} />
      ))}
    </>
  );
}

export type SwayPlan = {
  /** Tam döngü süresi (ms). */
  periodMs: number;
  /** Başlangıç açısı (derece); ağaçlar aynı anda aynı yerde başlamaz. */
  startAngle: number;
  /** Başlangıçtan +SWAY_DEGREES'e ilk bacağın süresi (ms), böylece faz tohumdan gelir. */
  firstLegMs: number;
};

/** Tohumdan sallanma planı. Saf fonksiyon: aynı tohum aynı plan. */
export function swayPlan(seed: number): SwayPlan {
  const rng = createRng(seed + 17);
  const periodMs = Math.round(SWAY_PERIOD_MIN_MS + rng() * (SWAY_PERIOD_MAX_MS - SWAY_PERIOD_MIN_MS));
  const startAngle = (rng() * 2 - 1) * SWAY_DEGREES;
  const firstLegMs = Math.max(1, Math.round(((SWAY_DEGREES - startAngle) / (2 * SWAY_DEGREES)) * (periodMs / 2)));
  return { periodMs, startAngle, firstLegMs };
}

/**
 * Gövde tabanı etrafında hafif, simetrik sallanma (-1.5° ↔ +1.5°).
 * İlk bacak tohumlu faz ofsetiyle kısaltılır; sonra tam döngü sürekli tekrarlanır.
 */
function useSway(enabled: boolean, seed: number) {
  const angle = useSharedValue(0);
  useEffect(() => {
    if (!enabled) {
      angle.value = 0;
      return;
    }
    const plan = swayPlan(seed);
    const half = plan.periodMs / 2;
    const easing = Easing.inOut(Easing.sin);
    angle.value = plan.startAngle;
    angle.value = withSequence(
      withTiming(SWAY_DEGREES, { duration: plan.firstLegMs, easing }),
      withRepeat(
        withSequence(
          withTiming(-SWAY_DEGREES, { duration: half, easing }),
          withTiming(SWAY_DEGREES, { duration: half, easing }),
        ),
        -1,
      ),
    );
  }, [enabled, seed, angle]);
  return useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.value}deg` }] }));
}

function TreeBase({
  species,
  size,
  seed,
  swaying = true,
  growIn = false,
  haze = 0,
  accessibilityLabel,
}: TreeProps) {
  const shape = useMemo(() => buildTree(species, seed, haze), [species, seed, haze]);
  const grows = useMotionEnabled(growIn);
  const sways = useMotionEnabled(swaying);
  const swayStyle = useSway(sways, seed);

  return (
    <Animated.View
      accessible={accessibilityLabel != null}
      accessibilityRole={accessibilityLabel != null ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel != null ? 'yes' : 'no-hide-descendants'}
      pointerEvents="none"
      style={[{ width: size, height: size, transformOrigin: '50% 100%' }, swayStyle]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${TREE_VIEWBOX} ${TREE_VIEWBOX}`}>
        {grows ? <GrowingTree shape={shape} /> : <StaticTree shape={shape} />}
      </Svg>
    </Animated.View>
  );
}

/** Üç türden (cam, meşe, çınar) elle çizilmiş gibi ağaç. Tohum varyasyon verir. */
export const Tree = memo(TreeBase);

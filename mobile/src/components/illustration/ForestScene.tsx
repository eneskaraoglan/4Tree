import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme';
import { illustration, mixHex, treeSpeciesNames } from '@/theme/illustration';

import { layoutForest, selectSwayingTrees, type ForestTreeInput, type PlacedTree } from './forestLayout';
import { createRng } from './random';
import { buildHill, LAYER_COUNT, layerBand, ridgeY } from './scenery';
import { Sprout } from './Sprout';
import { Tree } from './Tree';

/** Dokunma hedefi alt sınırı (dp). DESIGN.md: en az 44x44. */
const TOUCH_MIN = 44;
const RIDGE_LIGHT_OPACITY = [0.6, 0.45, 0.3, 0.18, 0.1] as const;
const SUN_X = 0.7;

export type ForestSceneTree = ForestTreeInput;

export type ForestSceneProps = {
  trees: readonly ForestSceneTree[];
  /** Sahne yüksekliği (dp). Genişlik üst konteynerden gelir (kenardan kenara). */
  height: number;
  /** Verilirse ağaçlar düğmedir. Verilmezse ağaçlar sadece görseldir (düğme değil, ekran okuyucudan gizli). */
  onTreePress?: (id: string) => void;
  /**
   * Sahnenin ekran okuyucu etiketi (i18n'den). Sahne etkileşimsizse (boş ya da onTreePress yok) tek bir
   * görsel olarak okunur. Ağaçlar düğmeyken kök erişilebilir grup olmaz, çünkü çocuk düğmelerin
   * tek tek odaklanabilmesi gerekir; bu durumda etiket yalnızca kökün accessibilityLabel'ı olarak kalır.
   */
  accessibilityLabel?: string;
  /** Her ağacın düğmesinin etiketi (i18n'den). Verilmezse tür adı okunur: "Çam", "Meşe", "Çınar". */
  treeAccessibilityLabel?: (tree: ForestSceneTree) => string;
  /**
   * Yakın katmanlardaki ağaçların hafif sallanması (varsayılan true). Uzak katmanlar durağandır ve
   * en çok 8 ağaç (MAX_SWAYING_TREES) sallanır; Reduce Motion açıksa hepsi durağandır.
   */
  swaying?: boolean;
};

type TreeItemProps = {
  id: string;
  species: PlacedTree['species'];
  seed: number;
  layer: number;
  size: number;
  x: number;
  baseY: number;
  label: string;
  interactive: boolean;
  swaying: boolean;
  onPressTree: (id: string) => void;
};

/**
 * Tek ağaç + en az 44x44 kutu. Etkileşimliyse düğme, değilse sadece görsel.
 * Prop'lar değişmedikçe yeniden çizilmez.
 */
const ForestTreeItem = memo(function ForestTreeItem({
  id,
  species,
  seed,
  layer,
  size,
  x,
  baseY,
  label,
  interactive,
  swaying,
  onPressTree,
}: TreeItemProps) {
  const box = Math.max(size, TOUCH_MIN);
  const handlePress = useCallback(() => onPressTree(id), [onPressTree, id]);
  const position = { left: x - box / 2, top: baseY - box, width: box, height: box };
  const tree = <Tree species={species} seed={seed} size={size} swaying={swaying} haze={illustration.hazeByLayer[layer]} />;

  if (!interactive) {
    return (
      <View pointerEvents="none" style={[styles.treeItem, position]}>
        {tree}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={handlePress}
      style={({ pressed }) => [styles.treeItem, position, pressed && styles.treePressed]}
    >
      {tree}
    </Pressable>
  );
});

type SkyProps = { width: number; height: number; ids: { sky: string; halo: string } };

/** Gün batımı gökyüzü, ufukta güneş ve hale, ince bulut şeritleri. */
const Sky = memo(function Sky({ width, height, ids }: SkyProps) {
  const { sky } = illustration;
  const skyHeight = height * 0.62;
  const sunX = width * SUN_X;
  const sunY = ridgeY(0, SUN_X, height) - height * 0.02;
  const sunR = Math.max(10, height * 0.055);
  const haloR = height * 0.5;
  const clouds = useMemo(() => {
    const rng = createRng(77);
    return [0, 1, 2].map((i) => ({
      cx: width * (0.14 + i * 0.3 + rng() * 0.1),
      cy: height * (0.16 + i * 0.07 + rng() * 0.03),
      rx: width * (0.1 + rng() * 0.07),
      ry: Math.max(2, height * 0.011),
      opacity: 0.14 + rng() * 0.1,
    }));
  }, [width, height]);

  return (
    <>
      <Defs>
        <LinearGradient id={ids.sky} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={sky.top} />
          <Stop offset="0.45" stopColor={sky.mid} />
          <Stop offset="0.8" stopColor={sky.horizon} />
          <Stop offset="1" stopColor={sky.horizon} />
        </LinearGradient>
        <RadialGradient id={ids.halo} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={sky.glow} stopOpacity={0.6} />
          <Stop offset="0.45" stopColor={sky.glow} stopOpacity={0.2} />
          <Stop offset="1" stopColor={sky.glow} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={skyHeight + 1} fill={`url(#${ids.sky})`} />
      {clouds.map((c, i) => (
        <Ellipse key={i} cx={c.cx} cy={c.cy} rx={c.rx} ry={c.ry} fill={sky.cloud} fillOpacity={c.opacity} />
      ))}
      <Ellipse cx={sunX} cy={sunY} rx={haloR} ry={haloR} fill={`url(#${ids.halo})`} />
      <Ellipse cx={sunX} cy={sunY} rx={sunR} ry={sunR} fill={sky.sun} fillOpacity={0.92} />
    </>
  );
});

type HillProps = { layer: number; width: number; height: number; gradientId: string; withSky?: SkyProps };

/** Bir tepe katmanı: sırttan aşağı doğru koyulaşan dolgu ve sırtta ufuk ışığı. */
const Hill = memo(function Hill({ layer, width, height, gradientId, withSky }: HillProps) {
  const shape = useMemo(() => buildHill(layer, width, height), [layer, width, height]);
  const color = illustration.hills[layer];
  const bottom = layer === LAYER_COUNT - 1 ? colors.canvas : mixHex(color, colors.canvas, 0.35);
  return (
    <Svg width={width} height={height} pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} />
          <Stop offset="0.5" stopColor={color} />
          <Stop offset="1" stopColor={bottom} />
        </LinearGradient>
      </Defs>
      {withSky ? <Sky {...withSky} /> : null}
      <Path d={shape.fill} fill={`url(#${gradientId})`} />
      <Path
        d={shape.ridge}
        fill="none"
        stroke={mixHex(illustration.sky.horizon, color, 0.45)}
        strokeOpacity={RIDGE_LIGHT_OPACITY[layer]}
        strokeWidth={1}
        strokeLinejoin="round"
      />
    </Svg>
  );
});

function ForestSceneBase({
  trees,
  height,
  onTreePress,
  accessibilityLabel,
  treeAccessibilityLabel,
  swaying = true,
}: ForestSceneProps) {
  const windowWidth = useWindowDimensions().width;
  const [measured, setMeasured] = useState<number | null>(null);
  const width = measured ?? windowWidth;
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, '');

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    if (next > 0) setMeasured((prev) => (prev === next ? prev : next));
  }, []);

  // Üstten gelen onTreePress her render'da yeni olabilir; ağaç öğeleri sabit bir sarmalayıcı görür.
  const pressRef = useRef(onTreePress);
  useEffect(() => {
    pressRef.current = onTreePress;
  }, [onTreePress]);
  const handleTreePress = useCallback((id: string) => pressRef.current?.(id), []);

  const placed = useMemo(() => layoutForest(trees, width, height), [trees, width, height]);
  const byLayer = useMemo(() => {
    const groups: PlacedTree[][] = Array.from({ length: LAYER_COUNT }, () => []);
    for (const t of placed) groups[t.layer].push(t);
    return groups;
  }, [placed]);
  const labelByTree = useMemo(
    () => new Map(trees.map((t) => [t.id, treeAccessibilityLabel?.(t) ?? treeSpeciesNames[t.species]])),
    [trees, treeAccessibilityLabel],
  );
  const swayingIds = useMemo(() => (swaying ? selectSwayingTrees(placed) : new Set<string>()), [placed, swaying]);
  const skyProps = useMemo(
    () => ({ width, height, ids: { sky: `sky${rawId}`, halo: `halo${rawId}` } }),
    [width, height, rawId],
  );

  const isEmpty = trees.length === 0;
  const interactive = onTreePress != null && !isEmpty;
  const sproutSize = Math.max(72, height * 0.3);
  const sproutY = ridgeY(LAYER_COUNT - 1, 0.5, height) + layerBand(LAYER_COUNT - 1, height) * 0.35;

  return (
    <View
      onLayout={handleLayout}
      accessible={!interactive && accessibilityLabel != null}
      accessibilityRole={!interactive && accessibilityLabel != null ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      // Ölçüm gelene kadar pencere genişliğiyle hesaplanır ama gizli kalır: genişlik farklıysa ilk karede sıçrama görünmez.
      style={[styles.root, { height }, measured == null && styles.unmeasured]}
    >
      {Array.from({ length: LAYER_COUNT }, (_, layer) => (
        <View key={layer} style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Hill
            layer={layer}
            width={width}
            height={height}
            gradientId={`hill${rawId}${layer}`}
            withSky={layer === 0 ? skyProps : undefined}
          />
          {byLayer[layer].map((t) => (
            <ForestTreeItem
              key={t.id}
              id={t.id}
              species={t.species}
              seed={t.seed}
              layer={t.layer}
              size={t.size}
              x={t.x}
              baseY={t.baseY}
              label={labelByTree.get(t.id) ?? treeSpeciesNames[t.species]}
              interactive={interactive}
              swaying={swayingIds.has(t.id)}
              onPressTree={handleTreePress}
            />
          ))}
        </View>
      ))}
      {isEmpty ? <Sprout size={sproutSize} x={width / 2} y={sproutY} /> : null}
    </View>
  );
}

export const ForestScene = memo(ForestSceneBase);

const styles = StyleSheet.create({
  root: { alignSelf: 'stretch', overflow: 'hidden', backgroundColor: colors.canvas },
  treeItem: { position: 'absolute', alignItems: 'center', justifyContent: 'flex-end' },
  treePressed: { opacity: 0.85 },
  unmeasured: { opacity: 0 },
});

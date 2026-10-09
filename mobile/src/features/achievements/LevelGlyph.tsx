import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';

import { Tree } from '@/components/illustration';
import { colors } from '@/theme';
import type { LevelName } from '@/types';

type Props = {
  level: LevelName;
  /** Kutu kenarı (dp). */
  size: number;
  /** Bulunulan seviyede ağaçlar hafifçe sallanır. */
  active: boolean;
};

/** Tohum: toprakta bir tohum, etrafında noktalı dikim işareti. */
function SeedDrawing({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60" pointerEvents="none">
      <Ellipse cx={30} cy={51} rx={19} ry={4.6} fill="none" stroke={colors.textSecondary} strokeOpacity={0.55} strokeWidth={0.9} strokeDasharray={[1.6, 3]} strokeLinecap="round" />
      <Path d="M12 51 C18 45 26 43.5 30 43.5 C35 43.5 43 45 48 51Z" fill={colors.bark} fillOpacity={0.55} />
      <Ellipse cx={30} cy={41} rx={4.6} ry={6.6} fill={colors.bark} transform="rotate(-22 30 41)" />
      <Path d="M28.8 36.5 C27.6 39.5 28 42.5 29.4 44.5" fill="none" stroke={colors.gold} strokeOpacity={0.85} strokeWidth={1.1} strokeLinecap="round" />
    </Svg>
  );
}

/** Fidan: ince gövde ve iki yaprak. */
function SaplingDrawing({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60" pointerEvents="none">
      <Ellipse cx={30} cy={51} rx={17} ry={3.4} fill={colors.bark} fillOpacity={0.5} />
      <Path d="M30 50 C29 43 31.5 36 30.2 25" fill="none" stroke={colors.primary} strokeWidth={1.9} strokeLinecap="round" />
      <Path d="M30.2 36.5 C22.5 38 16 34 14.5 26 C22.5 25 28.5 28.5 30.2 36.5Z" fill={colors.primary} />
      <Path d="M30.2 28 C31 19 37.5 14 45.5 14.8 C44.8 23 38.5 28 30.2 28Z" fill={colors.primary} fillOpacity={0.88} />
    </Svg>
  );
}

/** Seviye yolundaki durağın çizimi: tohum, fidan, ağaç, orman (üç ağaç). */
export function LevelGlyph({ level, size, active }: Props) {
  if (level === 'seed') return <SeedDrawing size={size} />;
  if (level === 'sapling') return <SaplingDrawing size={size} />;
  if (level === 'tree') return <Tree species="meşe" seed={11} size={size} swaying={active} />;
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.tree, { left: 0 }]}>
        <Tree species="cam" seed={3} size={size * 0.64} swaying={active} haze={0.2} />
      </View>
      <View style={[styles.tree, { right: 0 }]}>
        <Tree species="çınar" seed={5} size={size * 0.64} swaying={active} haze={0.2} />
      </View>
      <View style={[styles.tree, { left: size * 0.09 }]}>
        <Tree species="meşe" seed={9} size={size * 0.82} swaying={active} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tree: { position: 'absolute', bottom: 0 },
});

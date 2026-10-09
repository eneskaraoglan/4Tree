import { memo, useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

import { colors } from '@/theme';

type Props = {
  /** Kutu kenarı (dp). */
  size: number;
  /** Fidanın taban merkezi (px, üst konteynere göre). */
  x: number;
  y: number;
};

/**
 * Boş orman ipucu: toprakta bir tohum ve filizlenen küçük fidan, etrafında noktalı dikim işareti.
 * Elle çizilmiş gibi hafif eğri; "buraya ilk ağacın gelecek" duygusunu verir.
 */
function SproutBase({ size, x, y }: Props) {
  const glowId = `sproutGlow${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      pointerEvents="none"
      style={[styles.abs, { left: x - size / 2, top: y - size * 0.86 }]}
    >
      <Ellipse cx={30} cy={51} rx={19} ry={4.6} fill="none" stroke={colors.textSecondary} strokeOpacity={0.55} strokeWidth={0.9} strokeDasharray={[1.6, 3]} strokeLinecap="round" />
      <Defs>
        <RadialGradient id={glowId} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={colors.primary} stopOpacity={0.4} />
          <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={30} cy={36} rx={25} ry={24} fill={`url(#${glowId})`} />
      <Ellipse cx={30} cy={50} rx={11} ry={2.6} fill={colors.bark} fillOpacity={0.5} />
      <Path d="M30 50 C29 44 31.5 39 30.2 32" fill="none" stroke={colors.primary} strokeWidth={1.7} strokeLinecap="round" />
      <Path d="M30.2 35 C25 36.5 20 33.5 18.5 27.5 C24.5 26.5 29 29 30.2 35Z" fill={colors.primary} />
      <Path d="M30.4 31.5 C31 25 36 21 42 21.5 C41.5 27.5 37 31.5 30.4 31.5Z" fill={colors.primary} fillOpacity={0.88} />
      <Ellipse cx={41} cy={49.5} rx={2.4} ry={1.5} fill={colors.bark} transform="rotate(-24 41 49.5)" />
    </Svg>
  );
}

export const Sprout = memo(SproutBase);

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
});

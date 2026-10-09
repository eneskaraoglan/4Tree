import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppText } from '@/components/AppText';
import { fontFamily } from '@/theme';

type Props = {
  dayMonth: string;
  year: string;
  size: number;
  ink: string;
};

/** Damga yazısı küçük kalır; sistem yazı boyutu büyüyünce halkadan taşmasın diye ölçeklenmez. */
const TEXT_SIZE = 10;
const TEXT_LINE = 12;

/** Hafif eğik, yuvarlak posta damgası: çift halka ve iki satır tarih ("12 Eki" / "2026"). */
export function DatePostmark({ dayMonth, year, size, ink }: Props) {
  const outer = size / 2 - 1.5;
  const textStyle = { color: ink, fontFamily: fontFamily.displayBold, fontSize: TEXT_SIZE, lineHeight: TEXT_LINE, textAlign: 'center' } as const;
  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { width: size, height: size, transform: [{ rotate: '-12deg' }] }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={outer} fill="none" stroke={ink} strokeOpacity={0.85} strokeWidth={1.5} />
        <Circle cx={size / 2} cy={size / 2} r={outer - 3.5} fill="none" stroke={ink} strokeOpacity={0.7} strokeWidth={0.8} strokeDasharray={[1.2, 2]} />
      </Svg>
      <AppText maxFontSizeMultiplier={1} style={textStyle}>
        {dayMonth}
      </AppText>
      <AppText maxFontSizeMultiplier={1} style={textStyle}>
        {year}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});

import Svg, { Path } from 'react-native-svg';

import type { ReactionType } from '@/types';

/** Her ikon 24x24 kutuda, 1.75 çizgi kalınlığında, yuvarlak uçlu outline: tek çizgi dili. */
const STROKE_WIDTH = 1.75;
/** Aktif ikonun içi, kendi renginin bu kadar saydam dolgusuyla dolar. */
const ACTIVE_FILL_OPACITY = 0.32;

type Glyph = {
  d: string;
  /** false: ayrıntı çizgisi (parlama, damar, kıvılcım); aktifken doldurulmaz. */
  body?: boolean;
};

const GLYPHS: Record<ReactionType, Glyph[]> = {
  // Su damlası: belirgin gövde ve içinde ışık yansıması.
  water: [
    { d: 'M12 3.2 C12 3.2 5.6 10.1 5.6 14.5 A6.4 6.4 0 0 0 18.4 14.5 C18.4 10.1 12 3.2 12 3.2 Z', body: true },
    { d: 'M8.9 14.7 A3.1 3.1 0 0 0 12 17.8' },
  ],
  // Birleşen iki avuç ve üstünde üç kıvılcım.
  clap: [
    { d: 'M7.45 10.91 A2.3 2.3 0 0 1 11.72 12.63 L8.95 19.49 A2.3 2.3 0 0 1 4.68 17.77 Z', body: true },
    { d: 'M12.28 12.63 A2.3 2.3 0 0 1 16.55 10.91 L19.32 17.77 A2.3 2.3 0 0 1 15.05 19.49 Z', body: true },
    { d: 'M12 2.4 V4.8' },
    { d: 'M6.6 4.2 L8 6' },
    { d: 'M17.4 4.2 L16 6' },
  ],
  leaf: [
    { d: 'M5 19 C5 10.5 10 5 19.5 4.5 C19.5 13.5 15 19.5 5 19 Z', body: true },
    { d: 'M5 19 L13.2 10.8' },
  ],
  heart: [
    { d: 'M12 20 C12 20 4 14.8 4 9.3 A4.1 4.1 0 0 1 12 7.6 A4.1 4.1 0 0 1 20 9.3 C20 14.8 12 20 12 20 Z', body: true },
  ],
  // Şimşek: güç/enerji.
  power: [{ d: 'M13.4 3 L6 13.4 H11.2 L10.4 21 L18 10.2 H12.6 Z', body: true }],
};

export type ReactionIconProps = {
  size?: number;
  /** Çizgi ve dolgu rengi (tema token'ından gelir). */
  color: string;
  /** Seçili durum: gövde yarı saydam dolar. */
  active?: boolean;
};

type Props = ReactionIconProps & { type: ReactionType };

/** Kendi çizdiğimiz tepki ikonları (react-native-svg); emoji ya da hazır ikon seti değil. */
export function ReactionIcon({ type, size = 24, color, active = false }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" testID={`reaction-icon-${type}`}>
      {GLYPHS[type].map((glyph, index) => (
        <Path
          key={index}
          d={glyph.d}
          fill={active && glyph.body ? color : 'none'}
          fillOpacity={active && glyph.body ? ACTIVE_FILL_OPACITY : undefined}
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

export const WaterIcon = (props: ReactionIconProps) => <ReactionIcon type="water" {...props} />;
export const ClapIcon = (props: ReactionIconProps) => <ReactionIcon type="clap" {...props} />;
export const LeafIcon = (props: ReactionIconProps) => <ReactionIcon type="leaf" {...props} />;
export const HeartIcon = (props: ReactionIconProps) => <ReactionIcon type="heart" {...props} />;
export const PowerIcon = (props: ReactionIconProps) => <ReactionIcon type="power" {...props} />;

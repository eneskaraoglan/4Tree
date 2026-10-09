import { colors } from './colors';

/** "#rrggbb" iki rengi t (0-1) oranında karıştırır. Atmosfer sisi ve ara tonlar için. */
export function mixHex(from: string, to: string, t: number): string {
  const k = Math.min(1, Math.max(0, t));
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const out = [0, 1, 2].map((i) => {
    const v = Math.round(channel(from, i) + (channel(to, i) - channel(from, i)) * k);
    return v.toString(16).padStart(2, '0');
  });
  return `#${out.join('')}`;
}

/** 4-5 kademe orman yeşili, koyudan açığa. Kaynak: mobile/DESIGN.md "İllüstrasyon paleti". */
const forest = ['#1B3A2B', '#245238', '#2F6B45', '#4C8B52', '#8DBF6A'] as const;

/** Gün batımı gökyüzü: tepede gece yeşili, ufukta kehribar. */
const horizon = '#C9884A';
const skyTop = '#2B4A43';
const sky = {
  top: skyTop,
  mid: mixHex(skyTop, horizon, 0.45),
  horizon,
  /** Güneş halesi ve ufuk ışığı (colors.gold ile aynı kehribar). */
  glow: colors.gold,
  /** Güneş diski: kehribarın huş beyazına yakın tonu. */
  sun: mixHex(colors.gold, colors.text, 0.4),
  /** İnce bulut şeritleri. */
  cloud: mixHex(horizon, colors.text, 0.35),
} as const;

/** Sonbahar vurguları (meşe, çınar yapraklarının bir kısmı). */
const autumn = {
  amber: '#D08A3C',
  rust: '#B5532E',
} as const;

/**
 * Tepe katmanları, uzaktan yakına (0 = ufuk, 4 = en yakın).
 * Uzak katmanlar ufuk ışığıyla soluk, yakınlar koyu; en yakın katman ekran zeminine (canvas) erir.
 */
const hills = [
  mixHex(forest[2], horizon, 0.62),
  mixHex(forest[2], horizon, 0.3),
  mixHex(forest[1], forest[2], 0.4),
  mixHex(forest[1], forest[0], 0.45),
  forest[0],
] as const;

/** Katman başına ağaçlara uygulanan atmosfer sisi oranı (0 = yok). */
const hazeByLayer = [0.42, 0.28, 0.15, 0.06, 0] as const;

export const illustration = {
  sky,
  forest,
  autumn,
  hills,
  hazeByLayer,
  /** Sis rengi: ufuktaki kehribar. */
  haze: horizon,
  /** Gövdenin gölge tarafı. */
  barkShade: mixHex(colors.bark, colors.canvas, 0.3),
} as const;

/** Ağaç türlerinin ekran okuyucuda okunan Türkçe adları (tür anahtarı küçük harf, ad baş harfi büyük). */
export const treeSpeciesNames = {
  cam: 'Çam',
  meşe: 'Meşe',
  çınar: 'Çınar',
} as const;

export type IllustrationPalette = typeof illustration;

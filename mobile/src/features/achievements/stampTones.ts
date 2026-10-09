import { colors } from '@/theme';
import { illustration, mixHex } from '@/theme/illustration';

/** Bir pulun renk takımı. Kazanılanlar rozete göre yeşil/kehribar/gövde/pas tonlarından birini alır. */
export type StampTone = {
  /** Pul kağıdı (huş beyazına tonun hafif karışımı). */
  paper: string;
  /** Baskı alanı zemini. */
  field: string;
  /** Baskı alanındaki ince iç çerçeve. */
  frame: string;
  /** Kağıt üstündeki yazı ve tarih damgası mürekkebi (kağıtta WCAG AA). */
  ink: string;
  /** Motifin ana rengi (baskı alanında). */
  motif: string;
  /** Motifin vurgu rengi. */
  accent: string;
};

export type StampToneKey = 'leaf' | 'amber' | 'bark' | 'rust';

function buildTone(base: string, accent: string): StampTone {
  const paper = mixHex(colors.text, base, 0.12);
  return {
    paper,
    field: mixHex(base, colors.canvas, 0.45),
    frame: paper,
    ink: mixHex(base, colors.canvas, 0.6),
    motif: paper,
    accent,
  };
}

export const STAMP_TONES: Record<StampToneKey, StampTone> = {
  leaf: buildTone(illustration.forest[2], colors.primary),
  amber: buildTone(illustration.autumn.amber, colors.gold),
  bark: buildTone(colors.bark, mixHex(colors.bark, colors.text, 0.45)),
  rust: buildTone(illustration.autumn.rust, illustration.autumn.amber),
};

/** Kilitli pul: sönük, koyu siluet. Metin renkleri ekranda textSecondary/textTertiary ile verilir. */
export const LOCKED_TONE: StampTone = {
  paper: colors.surface,
  field: colors.canvas,
  frame: colors.divider,
  ink: colors.textSecondary,
  motif: colors.surface2,
  accent: colors.surface2,
};

const TONE_BY_BADGE: Record<string, StampToneKey> = {
  'first-5k': 'leaf',
  'first-tree': 'leaf',
  'weekend-warrior': 'amber',
  'km-100': 'bark',
  'early-bird': 'amber',
  'tree-hero-10': 'leaf',
  'half-marathon': 'rust',
  'streak-7': 'bark',
  'forest-keeper': 'leaf',
};

const TONE_KEYS: StampToneKey[] = ['leaf', 'amber', 'bark', 'rust'];

/** Bilinmeyen rozet id'leri için id'den deterministik ton. */
export function toneKeyFor(id: string): StampToneKey {
  const known = TONE_BY_BADGE[id];
  if (known) return known;
  let sum = 0;
  for (let i = 0; i < id.length; i += 1) sum += id.charCodeAt(i);
  return TONE_KEYS[sum % TONE_KEYS.length];
}

import { spacing, touch } from '@/theme';

export type ReactionBarSize = 'md' | 'sm';

/** Tepki çubuğu ölçüleri (dp). `md` gönderi, `sm` yorum içindir; dokunma alanı her ikisinde ≥ 44. */
export const REACTION_SIZES = {
  md: { icon: 24, pebble: 36, summaryIcon: 18, summaryRing: 24 },
  sm: { icon: 20, pebble: 32, summaryIcon: 14, summaryRing: 20 },
} as const;

export const REACTION_MOTION = {
  bounceScale: 1.3,
  bounceUpMs: 110,
  bounceDownMs: 170,
  /** Basılı tutma süresi: seçici bu kadar sonra açılır. */
  longPressMs: 350,
} as const;

export const PICKER = {
  /** Her seçenek en az 44x44. */
  item: touch.min,
  padding: spacing.xs + 2,
  /** Düğme ile hap arasındaki boşluk. */
  gap: spacing.sm,
  /** Hap ekran kenarına bu kadar yaklaşabilir. */
  edge: spacing.sm,
  /** Üstte hap sığmazsa (durum çubuğu altı) düğmenin altına açılır. */
  minTop: 56,
  /** Parmak hapın bu kadar üstünde/altında olsa da seçeneği izlemeye devam eder. */
  hoverSlopY: 32,
  iconSize: 26,
  borderWidth: 1,
} as const;

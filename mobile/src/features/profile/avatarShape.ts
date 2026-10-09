import { closedShapePath } from '@/components/illustration/shapes';
import { createRng, hashString } from '@/components/illustration/random';
import { colors } from '@/theme';

/** Koyu (onPrimary) harfin AA verdiği dolgular; parlak yeşil (primary) ekran vurgusu için ayrıldı. */
export const AVATAR_COLORS = [colors.gold, colors.water, colors.textSecondary, colors.bark] as const;

export type AvatarColor = (typeof AVATAR_COLORS)[number];

const POINT_COUNT = 9;
/** Yarıçapın en fazla bu oranda (±) oynaması: düz daire değil, hafif organik "taş" biçimi. */
const JITTER = 0.1;

/** Aynı addan her zaman aynı renk. */
export function avatarColor(name: string): AvatarColor {
  return AVATAR_COLORS[hashString(name.trim().toLocaleLowerCase('tr')) % AVATAR_COLORS.length];
}

/** Aynı addan her zaman aynı, `size` kare alana sığan organik blob yolu. */
export function avatarPath(name: string, size: number): string {
  const rng = createRng(hashString(name.trim().toLocaleLowerCase('tr')) + 7);
  const center = size / 2;
  const base = size / 2 / (1 + JITTER) - 1;
  const phase = rng() * Math.PI * 2;
  const pts: number[] = [];
  for (let i = 0; i < POINT_COUNT; i += 1) {
    const angle = phase + (i / POINT_COUNT) * Math.PI * 2;
    const radius = base * (1 + (rng() * 2 - 1) * JITTER);
    pts.push(center + Math.cos(angle) * radius, center + Math.sin(angle) * radius);
  }
  return closedShapePath(pts, center, center, 1, true);
}

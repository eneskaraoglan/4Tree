import type { Badge } from '@/types';

/** Pasaport sırası: kazanılanlar kazanma tarihine göre (sayfa dolar gibi), ardından kilitliler servis sırasıyla. */
export function orderBadges(badges: Badge[]): Badge[] {
  const earned = badges
    .filter((b) => b.earned)
    .sort((a, b) => (a.earnedAt ?? '').localeCompare(b.earnedAt ?? ''));
  const locked = badges.filter((b) => !b.earned);
  return [...earned, ...locked];
}

export function countEarned(badges: Badge[]): number {
  return badges.filter((b) => b.earned).length;
}

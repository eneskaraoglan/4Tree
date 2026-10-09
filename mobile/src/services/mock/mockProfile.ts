import type { Activity, Profile } from '@/types';

import { kmToTrees } from '../conversion';
import { getLevelProgress } from '../levels';

/** Profil alanları aktivitelerden türetilir; tutarsızlık olamaz. Aktivite yoksa yeni kullanıcı. */
export function buildMockProfile(activities: Activity[]): Profile {
  const totalKm = Math.round(activities.reduce((sum, a) => sum + a.distanceKm, 0) * 10) / 10;
  const activeDays = new Set(activities.map((a) => a.startedAt.slice(0, 10))).size;
  return {
    id: 'user-elif',
    name: 'Elif',
    avatarInitial: 'E',
    level: getLevelProgress(totalKm).level,
    totalKm,
    totalTrees: kmToTrees(totalKm),
    activeDays,
  };
}

import type { Activity, Profile, UserProfile } from '@/types';

import { kmToTrees } from '../conversion';
import { getLevelProgress } from '../levels';

/** Üyelik başlangıcı: en eski aktivitenin tarihi (metin olduğu gibi korunur); aktivite yoksa yok. */
function earliestStartedAt(activities: Activity[]): string | undefined {
  let earliest: Activity | undefined;
  for (const activity of activities) {
    if (!earliest || Date.parse(activity.startedAt) < Date.parse(earliest.startedAt)) earliest = activity;
  }
  return earliest?.startedAt;
}

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
    joinedAt: earliestStartedAt(activities),
  };
}

export function buildMockUserProfiles(selfProfile: Profile): Map<string, UserProfile> {
  const users: UserProfile[] = [
    {
      id: selfProfile.id,
      name: selfProfile.name,
      avatarInitial: selfProfile.avatarInitial,
      level: selfProfile.level,
      totalKm: selfProfile.totalKm,
      totalTrees: selfProfile.totalTrees,
      activeDays: selfProfile.activeDays,
      visibility: 'public',
      friendshipStatus: 'friends',
      joinedAt: selfProfile.joinedAt,
    },
    {
      id: 'user-mert',
      name: 'Mert',
      avatarInitial: 'M',
      level: 'tree',
      totalKm: 142.5,
      totalTrees: 7,
      activeDays: 24,
      visibility: 'public',
      friendshipStatus: 'friends',
      joinedAt: '2026-06-15T08:00:00+03:00',
    },
    {
      id: 'user-zeynep',
      name: 'Zeynep',
      avatarInitial: 'Z',
      level: 'tree',
      totalKm: 168.0,
      totalTrees: 8,
      activeDays: 31,
      visibility: 'friends',
      friendshipStatus: 'friends',
      joinedAt: '2026-05-20T10:00:00+03:00',
    },
    {
      id: 'user-can',
      name: 'Can',
      avatarInitial: 'C',
      level: 'sapling',
      totalKm: 45.2,
      totalTrees: 2,
      activeDays: 9,
      visibility: 'public',
      friendshipStatus: 'friends',
      joinedAt: '2026-08-01T07:30:00+03:00',
    },
    {
      id: 'user-defne',
      name: 'Defne',
      avatarInitial: 'D',
      level: 'forest',
      totalKm: 520.0,
      totalTrees: 26,
      activeDays: 85,
      visibility: 'public',
      friendshipStatus: 'friends',
      joinedAt: '2026-03-10T11:00:00+03:00',
    },
    {
      id: 'user-selin',
      name: 'Selin',
      avatarInitial: 'S',
      level: 'sapling',
      totalKm: 32.5,
      totalTrees: 1,
      activeDays: 6,
      visibility: 'public',
      friendshipStatus: 'none',
      joinedAt: '2026-09-01T09:00:00+03:00',
    },
    {
      id: 'user-baris',
      name: 'Barış',
      avatarInitial: 'B',
      level: 'tree',
      totalKm: 195.4,
      totalTrees: 9,
      activeDays: 29,
      visibility: 'friends',
      friendshipStatus: 'none',
      joinedAt: '2026-04-12T14:00:00+03:00',
    },
    {
      id: 'user-ece',
      name: 'Ece',
      avatarInitial: 'E',
      level: 'seed',
      totalKm: 12.8,
      totalTrees: 0,
      activeDays: 3,
      visibility: 'private',
      friendshipStatus: 'pending',
      joinedAt: '2026-09-25T18:00:00+03:00',
    },
    {
      id: 'user-ali',
      name: 'Ali',
      avatarInitial: 'A',
      level: 'sapling',
      totalKm: 28.0,
      totalTrees: 1,
      activeDays: 5,
      visibility: 'public',
      friendshipStatus: 'incoming',
      joinedAt: '2026-09-18T16:00:00+03:00',
    },
  ];

  return new Map(users.map((u) => [u.id, { ...u }]));
}

export type ActivityType = 'run' | 'walk';

export type RoutePoint = {
  lat: number;
  lng: number;
};

export type Activity = {
  id: string;
  type: ActivityType;
  distanceKm: number;
  durationSec: number;
  /** Tempo: saniye / km. */
  paceSecPerKm: number;
  /** ISO 8601 başlangıç zamanı. */
  startedAt: string;
  /** Bölge adı, örn. "Belgrad Ormanı". */
  place: string;
  route: RoutePoint[];
  /** Bu aktivitenin tamamladığı ağaç sayısı. */
  treesEarned: number;
};

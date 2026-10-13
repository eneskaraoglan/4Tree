import { haversineM } from './geo';
import type { TrackPoint } from './types';

/** Anlık tempo penceresi: son 30 sn. GPS gürültüsü tek örnekle değil, pencerenin toplamıyla yumuşar. */
export const PACE_WINDOW_SEC = 30;
/** Pencerede en az bu süre ve mesafe yoksa tempo hesaplanmaz ("–:––"). */
const MIN_WINDOW_SEC = 5;
const MIN_WINDOW_M = 8;
/** Üstel yumuşatma katsayısı: yeni değerin ağırlığı. */
export const PACE_SMOOTHING = 0.35;
/** Ortalama tempo için en az mesafe (km); altında anlamsız uçlar çıkar. */
const MIN_AVG_DISTANCE_KM = 0.05;
/** Bundan yavaş tempo (sn/km, 30 dk/km) durmuş sayılır ve gösterilmez. */
const MAX_DISPLAY_PACE = 1800;

/** Ortalama tempo (sn/km). Mesafe çok kısaysa ya da süre yoksa null. */
export function averagePace(distanceKm: number, durationSec: number): number | null {
  if (!Number.isFinite(distanceKm) || !Number.isFinite(durationSec)) return null;
  if (distanceKm < MIN_AVG_DISTANCE_KM || durationSec <= 0) return null;
  const pace = durationSec / distanceKm;
  return pace > MAX_DISPLAY_PACE ? null : pace;
}

/**
 * Son `windowSec` içindeki noktalardan kayan pencere tempo (sn/km). Sadece aynı bölümün noktaları kullanılır
 * (duraklatma boşluğu tempoyu bozmasın). Pencerede yeterli veri yoksa null.
 */
export function windowedPace(points: readonly TrackPoint[], windowSec: number = PACE_WINDOW_SEC): number | null {
  const last = points[points.length - 1];
  if (!last) return null;
  let distanceM = 0;
  let startT = last.t;
  for (let i = points.length - 1; i > 0; i--) {
    const cur = points[i];
    const prev = points[i - 1];
    if (prev.seg !== cur.seg) break;
    distanceM += haversineM(prev, cur);
    startT = prev.t;
    if (last.t - prev.t >= windowSec * 1000) break;
  }
  const seconds = (last.t - startT) / 1000;
  if (seconds < MIN_WINDOW_SEC || distanceM < MIN_WINDOW_M) return null;
  const pace = seconds / (distanceM / 1000);
  return pace > MAX_DISPLAY_PACE ? null : pace;
}

/** Üstel yumuşatma: önceki değer yoksa yeni değer aynen alınır. */
export function smoothPace(previous: number | null, next: number, alpha: number = PACE_SMOOTHING): number {
  return previous === null ? next : previous + alpha * (next - previous);
}

/** Tempo (sn/km) -> "6:12". Değer yoksa "–:––". Saniye yuvarlaması dakikaya taşar (6:59,6 -> "7:00"). */
export function formatPace(secPerKm: number | null): string {
  if (secPerKm === null || !Number.isFinite(secPerKm) || secPerKm <= 0) return '–:––';
  const total = Math.round(secPerKm);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

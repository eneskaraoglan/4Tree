import { haversineM } from './geo';
import type { TrackPoint } from './types';
import type { ActivityType } from '@/types';

/**
 * OTOMATİK TÜR EŞİKLERİ (hepsi burada, başka yerde sabit yok).
 * VARSAYIM, Cem/Ali ile ayarlanır: gerekçeler yaklaşık değerlerdir, saha verisiyle kalibre edilmemiştir.
 */
/** Bu hızın (km/s) üstü koşu sayılır. Hızlı yürüyüş ~6-6,5 km/s'e çıkar; 7,0 km/s ≈ 8:34 dk/km, yavaş koşu temposu. */
export const RUN_MIN_SPEED_KMH = 7.0;
/** Karışık aktivitede tür, bu uzunluktaki ardışık pencerelerin çoğunluğuyla (süreye göre) belirlenir. */
export const CLASSIFY_WINDOW_SEC = 60;
/** Bu hızın (m/sn) altındaki aralıklar durma sayılır (trafik ışığı, su molası) ve tür hesabına girmez. */
export const MOVING_MIN_SPEED_MS = 0.7;
/** Hareket süresi bundan kısaysa ya da mesafe bundan azsa tür güvenilir değildir; varsayılan 'walk'. */
export const MIN_CLASSIFY_MOVING_SEC = 30;
export const MIN_CLASSIFY_DISTANCE_M = 50;
/** Kayan nokta ve koordinat yuvarlaması için eşik toleransı (km/s): tam 7,0'da koşu sayılsın. */
const SPEED_EPSILON_KMH = 0.01;

export type Classification = {
  type: ActivityType;
  /** Hareket halindeki ortalama hız (km/s). */
  avgSpeedKmh: number;
  /** Koşu hızındaki pencerelerin hareket süresine oranı, 0-1. */
  runShare: number;
  /** Veri yetersizse (çok kısa ya da hareketsiz) false; tür 'walk' varsayılır. */
  reliable: boolean;
};

type Leg = { sec: number; meters: number };

function buildLegs(points: readonly TrackPoint[]): Leg[] {
  const legs: Leg[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a.seg !== b.seg) continue;
    const sec = (b.t - a.t) / 1000;
    if (!(sec > 0)) continue;
    const meters = haversineM(a, b);
    if (meters / sec < MOVING_MIN_SPEED_MS) continue;
    legs.push({ sec, meters });
  }
  return legs;
}

/**
 * Rota noktalarından aktivite türünü önerir.
 * 1) Durma aralıkları atılır; kalan "hareket" 60 sn'lik ardışık pencerelere bölünür.
 * 2) Hızı >= RUN_MIN_SPEED_KMH olan pencerelerin süresi koşu, kalanı yürüyüş sayılır; çoğunluk kazanır.
 * 3) Eşitlikte ortalama hıza bakılır. Veri yetersizse 'walk' ve reliable=false.
 */
export function classifyActivity(points: readonly TrackPoint[]): Classification {
  const legs = buildLegs(points);
  const movingSec = legs.reduce((sum, l) => sum + l.sec, 0);
  const movingM = legs.reduce((sum, l) => sum + l.meters, 0);
  const avgSpeedKmh = movingSec > 0 ? (movingM / movingSec) * 3.6 : 0;

  if (movingSec < MIN_CLASSIFY_MOVING_SEC || movingM < MIN_CLASSIFY_DISTANCE_M) {
    return { type: 'walk', avgSpeedKmh, runShare: 0, reliable: false };
  }

  // Pencereler: bacaklar sırayla doldurulur; sınıra denk gelen bacak orantılı bölünür.
  let runSec = 0;
  let walkSec = 0;
  let winSec = 0;
  let winM = 0;
  const closeWindow = () => {
    if (winSec <= 0) return;
    const kmh = (winM / winSec) * 3.6;
    if (kmh >= RUN_MIN_SPEED_KMH - SPEED_EPSILON_KMH) runSec += winSec;
    else walkSec += winSec;
    winSec = 0;
    winM = 0;
  };
  for (const leg of legs) {
    let remainingSec = leg.sec;
    const speed = leg.meters / leg.sec;
    while (remainingSec > 0) {
      const take = Math.min(remainingSec, CLASSIFY_WINDOW_SEC - winSec);
      winSec += take;
      winM += speed * take;
      remainingSec -= take;
      if (winSec >= CLASSIFY_WINDOW_SEC - 1e-9) closeWindow();
    }
  }
  closeWindow();

  const runShare = runSec / (runSec + walkSec);
  const type: ActivityType =
    runSec > walkSec ? 'run' : runSec < walkSec ? 'walk' : avgSpeedKmh >= RUN_MIN_SPEED_KMH - SPEED_EPSILON_KMH ? 'run' : 'walk';
  return { type, avgSpeedKmh, runShare, reliable: true };
}

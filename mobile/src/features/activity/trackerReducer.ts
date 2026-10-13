import { haversineM } from './geo';
import { averagePace, smoothPace, windowedPace } from './pace';
import type { LocationSample, TrackPoint } from './types';

/** Bundan kötü doğruluktaki (m) ölçümler elenir. */
export const MAX_ACCURACY_M = 50;
/** Bundan hızlı (m/sn, ~45 km/s) görünen sıçramalar GPS hatası sayılır ve elenir. */
export const MAX_SPEED_MS = 12.5;
/** Çapaya bundan yakın (m) ölçümler duruş gürültüsüdür; mesafeye eklenmez. Doğruluk kötüyse eşik yarı doğrulukla büyür. */
export const MIN_MOVE_M = 3;
/** Üst üste bu kadar sıçrama reddedilirse yeni konum gerçek kabul edilir (çapa taşınır, mesafe eklenmez). */
export const REANCHOR_AFTER_JUMPS = 5;
/**
 * Başlama/devam anından bu kadar (ms) daha eski zaman damgalı ölçümler bayattır (önbellekteki son konum,
 * duraklatma sırasında kuyruğa girmiş ölçüm) ve elenir. Küçük pay, cihaz ve GPS saati farkı içindir.
 */
export const STALE_SAMPLE_TOLERANCE_MS = 1000;
/** Kaydedilebilecek en kısa aktivite (km). */
export const MIN_SAVE_DISTANCE_KM = 0.05;

export type TrackerStatus = 'idle' | 'running' | 'paused' | 'finished';

export type TrackerState = {
  status: TrackerStatus;
  /** Epoch ms; ilk başlama zamanı. */
  startedAt: number | null;
  /** Duraklatmalara kadar biriken aktif süre (ms). */
  activeMs: number;
  /** Çalışırken son devam/başlama anı; durunca null. */
  resumedAt: number | null;
  distanceM: number;
  points: TrackPoint[];
  segment: number;
  /** Mesafe hesabının dayandığı son konum; duraklatma sonrası null (ilk ölçüm yeni çapa olur). */
  anchor: TrackPoint | null;
  jumpRejects: number;
  /** Son işlenen ölçümün zamanı (aynı/eski zamanlı yinelenenleri atmak için). */
  lastSampleAt: number | null;
  lastAccuracyM: number | null;
  /** Yumuşatılmış anlık tempo (sn/km). */
  paceSecPerKm: number | null;
};

export type TrackerAction =
  | { type: 'start'; now: number }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  | { type: 'finish'; now: number }
  | { type: 'sample'; sample: LocationSample }
  | { type: 'restore'; snapshot: TrackerSnapshot }
  | { type: 'reset' };

/** Diske yazılan, uygulama kapanınca aktiviteyi kurtarmaya yeten minimum durum. */
export type TrackerSnapshot = {
  v: 1;
  startedAt: number;
  activeMs: number;
  distanceM: number;
  segment: number;
  points: TrackPoint[];
  savedAt: number;
};

export const initialTrackerState: TrackerState = {
  status: 'idle',
  startedAt: null,
  activeMs: 0,
  resumedAt: null,
  distanceM: 0,
  points: [],
  segment: 0,
  anchor: null,
  jumpRejects: 0,
  lastSampleAt: null,
  lastAccuracyM: null,
  paceSecPerKm: null,
};

/** Toplam aktif süre (ms): duraklatmada donar. */
export function elapsedMs(state: TrackerState, now: number): number {
  if (state.status === 'running' && state.resumedAt !== null) {
    return state.activeMs + Math.max(0, now - state.resumedAt);
  }
  return state.activeMs;
}

export const elapsedSec = (state: TrackerState, now: number): number => Math.floor(elapsedMs(state, now) / 1000);
export const distanceKm = (state: TrackerState): number => state.distanceM / 1000;

export function avgPaceOf(state: TrackerState, now: number): number | null {
  return averagePace(distanceKm(state), elapsedMs(state, now) / 1000);
}

function applySample(state: TrackerState, s: LocationSample): TrackerState {
  if (state.status !== 'running') return state;
  // Ön plan ve arka plan akışı aynı ölçümü iki kez getirebilir; eski/aynı zamanlı olan atılır.
  if (state.lastSampleAt !== null && s.timestamp <= state.lastSampleAt) return state;
  if (state.resumedAt !== null && s.timestamp < state.resumedAt - STALE_SAMPLE_TOLERANCE_MS) return state;

  const seen: TrackerState = { ...state, lastSampleAt: s.timestamp, lastAccuracyM: s.accuracyM };
  if (s.accuracyM !== null && s.accuracyM > MAX_ACCURACY_M) return seen;

  const point: TrackPoint = { lat: s.lat, lng: s.lng, t: s.timestamp, seg: state.segment };
  const { anchor } = state;
  if (!anchor) {
    return { ...seen, points: [...state.points, point], anchor: point, jumpRejects: 0 };
  }

  const meters = haversineM(anchor, point);
  if (meters < Math.max(MIN_MOVE_M, (s.accuracyM ?? 0) * 0.5)) return seen;

  const seconds = (point.t - anchor.t) / 1000;
  if (meters / seconds > MAX_SPEED_MS) {
    const jumps = state.jumpRejects + 1;
    if (jumps < REANCHOR_AFTER_JUMPS) return { ...seen, jumpRejects: jumps };
    // Gerçek bir konum değişimi (tünel çıkışı vb.): yeni bölüm, mesafe eklenmez.
    const segment = state.segment + 1;
    const moved: TrackPoint = { ...point, seg: segment };
    return { ...seen, segment, points: [...state.points, moved], anchor: moved, jumpRejects: 0 };
  }

  const points = [...state.points, point];
  const raw = windowedPace(points);
  return {
    ...seen,
    points,
    anchor: point,
    jumpRejects: 0,
    distanceM: state.distanceM + meters,
    paceSecPerKm: raw === null ? state.paceSecPerKm : smoothPace(state.paceSecPerKm, raw),
  };
}

export function trackerReducer(state: TrackerState, action: TrackerAction): TrackerState {
  switch (action.type) {
    case 'start':
      if (state.status !== 'idle') return state;
      return { ...initialTrackerState, status: 'running', startedAt: action.now, resumedAt: action.now };
    case 'pause':
      if (state.status !== 'running') return state;
      return {
        ...state,
        status: 'paused',
        activeMs: elapsedMs(state, action.now),
        resumedAt: null,
        anchor: null,
        paceSecPerKm: null,
      };
    case 'resume':
      if (state.status !== 'paused') return state;
      // Yeni bölüm: duraklatma sırasında yer değiştirmiş olabilirsin, aradaki sıçrama mesafeye girmez.
      return { ...state, status: 'running', resumedAt: action.now, segment: state.segment + 1, anchor: null, lastSampleAt: null };
    case 'finish':
      if (state.status !== 'running' && state.status !== 'paused') return state;
      return { ...state, status: 'finished', activeMs: elapsedMs(state, action.now), resumedAt: null, anchor: null };
    case 'sample':
      return applySample(state, action.sample);
    case 'restore':
      return {
        ...initialTrackerState,
        status: 'paused',
        startedAt: action.snapshot.startedAt,
        activeMs: action.snapshot.activeMs,
        distanceM: action.snapshot.distanceM,
        segment: action.snapshot.segment,
        points: action.snapshot.points,
      };
    case 'reset':
      return initialTrackerState;
    default:
      return state;
  }
}

export function toSnapshot(state: TrackerState, now: number): TrackerSnapshot | null {
  if (state.startedAt === null || (state.status !== 'running' && state.status !== 'paused')) return null;
  return {
    v: 1,
    startedAt: state.startedAt,
    activeMs: elapsedMs(state, now),
    distanceM: Math.round(state.distanceM * 10) / 10,
    segment: state.segment,
    // 6 ondalık ≈ 0,1 m: depolama boyutunu küçültür, rotayı bozmaz.
    points: state.points.map((p) => ({ ...p, lat: Math.round(p.lat * 1e6) / 1e6, lng: Math.round(p.lng * 1e6) / 1e6 })),
    savedAt: now,
  };
}

export function isSnapshot(value: unknown): value is TrackerSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.v === 1 &&
    typeof v.startedAt === 'number' &&
    typeof v.activeMs === 'number' &&
    typeof v.distanceM === 'number' &&
    typeof v.segment === 'number' &&
    Array.isArray(v.points) &&
    v.points.every(
      (p) =>
        typeof p === 'object' &&
        p !== null &&
        typeof (p as TrackPoint).lat === 'number' &&
        typeof (p as TrackPoint).lng === 'number' &&
        typeof (p as TrackPoint).t === 'number' &&
        typeof (p as TrackPoint).seg === 'number',
    )
  );
}

export type TrackResult = {
  startedAt: string;
  durationSec: number;
  distanceKm: number;
  points: TrackPoint[];
  route: { lat: number; lng: number }[];
};

/** Biten (ya da kurtarılan) aktivitenin kaydedilebilir özeti. */
export function buildResult(state: TrackerState): TrackResult {
  return {
    startedAt: new Date(state.startedAt ?? 0).toISOString(),
    durationSec: Math.round(state.activeMs / 1000),
    distanceKm: Math.round(state.distanceM) / 1000,
    points: state.points,
    route: state.points.map(({ lat, lng }) => ({ lat, lng })),
  };
}

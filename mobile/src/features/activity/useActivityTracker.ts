import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { LocationPermissionError, type LocationSource, type LocationTracking } from './LocationSource';
import {
  avgPaceOf,
  buildResult,
  distanceKm,
  elapsedSec,
  initialTrackerState,
  MAX_ACCURACY_M,
  toSnapshot,
  trackerReducer,
  type TrackerAction,
  type TrackerSnapshot,
  type TrackerState,
  type TrackerStatus,
  type TrackResult,
} from './trackerReducer';

/** Bu süre ölçüm gelmezse sinyal "kayıp" sayılır. */
export const SIGNAL_LOST_AFTER_MS = 15_000;
/** Son hareketten bu kadar sonra anlık tempo gösterilmez (durdun). */
export const STATIONARY_AFTER_MS = 10_000;
const DEFAULT_TICK_MS = 500;
const DEFAULT_PERSIST_MS = 10_000;

export type GpsState = 'idle' | 'searching' | 'good' | 'weak' | 'lost';
export type TrackerError = 'permission' | 'unavailable' | null;

type Options = {
  source: LocationSource;
  /** Zaman kaynağı (epoch ms); testte sabitlenir. */
  now?: () => number;
  tickMs?: number;
  /** Periyodik taslak yazımı; verilmezse yazılmaz. */
  persist?: (snapshot: TrackerSnapshot) => void;
  persistEveryMs?: number;
};

export type ActivityTracker = {
  status: TrackerStatus;
  elapsedSec: number;
  distanceKm: number;
  /** Yumuşatılmış anlık tempo (sn/km); durduysan ya da veri yoksa null. */
  currentPace: number | null;
  /** Ortalama tempo (sn/km); mesafe çok kısaysa null. */
  averagePace: number | null;
  route: { lat: number; lng: number }[];
  gps: GpsState;
  error: TrackerError;
  /** Arka plan konum takibi gerçekten çalışıyor mu. */
  background: boolean;
  /** Bitince dolu. */
  result: TrackResult | null;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  finish: () => void;
  /** Diskten okunan taslağı duraklatılmış durumda geri yükler. */
  restore: (snapshot: TrackerSnapshot) => void;
  /** Anlık taslak (yazılacak bir şey yoksa null). */
  snapshot: () => TrackerSnapshot | null;
};

/**
 * Aktivite takibi: durum makinesi (idle/running/paused/finished), mesafe, tempo, süre ve taslak yazımı.
 * Konum kaynağı enjekte edilir; elenme kuralları trackerReducer'dadır.
 */
export function useActivityTracker({
  source,
  now = Date.now,
  tickMs = DEFAULT_TICK_MS,
  persist,
  persistEveryMs = DEFAULT_PERSIST_MS,
}: Options): ActivityTracker {
  const [state, setState] = useState<TrackerState>(initialTrackerState);
  const [tick, setTick] = useState(now);
  const [error, setError] = useState<TrackerError>(null);
  const [background, setBackground] = useState(false);
  // Durumun SENKRON kopyası: await sonrası kontroller ve çift çağrı korumaları render beklemeden güncel olmalı.
  const stateRef = useRef<TrackerState>(initialTrackerState);
  const tracking = useRef<LocationTracking | null>(null);
  /** Her açılış/kapanışta artar; eski oturumun geç gelen ölçümleri bununla elenir. */
  const sessionRef = useRef(0);
  /** start/stop/resume çağrıları tek zincirde sırayla çalışır; birbirini geçemez. */
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const mounted = useRef(true);
  const persistedCount = useRef(0);
  const persistRef = useRef(persist);

  useEffect(() => {
    persistRef.current = persist;
  });

  const apply = useCallback((action: TrackerAction) => {
    stateRef.current = trackerReducer(stateRef.current, action);
    setState(stateRef.current);
  }, []);

  /** Await sonrası güncel durum (derleyici daralmasından kaçınmak için fonksiyon). */
  const currentStatus = useCallback((): TrackerStatus => stateRef.current.status, []);

  const enqueueOp = useCallback(<T,>(op: () => Promise<T>): Promise<T> => {
    const run = chain.current.then(op, op);
    chain.current = run.catch(() => undefined);
    return run;
  }, []);

  const closeTracking = useCallback(async () => {
    sessionRef.current += 1;
    const current = tracking.current;
    tracking.current = null;
    setBackground(false);
    try {
      await current?.stop();
    } catch {
      // Durdurma hatası kullanıcıyı ilgilendirmez.
    }
  }, []);

  /**
   * Kaynağı açar. Beklerken durum değiştiyse (duraklatıldı, bitti, ekran kapandı) açılan takibi hemen durdurur:
   * hiçbir oturum sahipsiz kalmaz.
   */
  const openTracking = useCallback(async (): Promise<'ok' | 'permission' | 'unavailable' | 'cancelled'> => {
    if (!mounted.current || stateRef.current.status !== 'running') return 'cancelled';
    await closeTracking();
    const session = ++sessionRef.current;
    let next: LocationTracking;
    try {
      next = await source.start({
        onSample: (sample) => {
          if (sessionRef.current === session) apply({ type: 'sample', sample });
        },
        onError: () => {
          if (sessionRef.current === session) setError('unavailable');
        },
      });
    } catch (e) {
      const reason = e instanceof LocationPermissionError ? 'permission' : 'unavailable';
      if (mounted.current) setError(reason);
      return reason;
    }
    if (!mounted.current || stateRef.current.status !== 'running' || sessionRef.current !== session) {
      try {
        await next.stop();
      } catch {
        // Geç açılan takip kapatılamazsa yapılacak bir şey yok.
      }
      return 'cancelled';
    }
    tracking.current = next;
    setBackground(next.background);
    setError(null);
    return 'ok';
  }, [source, apply, closeTracking]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // Strict Mode sahte unmount'unda hemen yeniden bağlanılır: kapatma sırası geldiğinde hâlâ ayrıksa kapatılır.
      void enqueueOp(async () => {
        if (!mounted.current) await closeTracking();
      });
    };
  }, [enqueueOp, closeTracking]);

  const start = useCallback(async () => {
    if (stateRef.current.status !== 'idle') return;
    const at = now();
    setTick(at);
    setError(null);
    apply({ type: 'start', now: at });
    const outcome = await enqueueOp(openTracking);
    // İzin yoksa hiç başlamamış gibi geri dön. Başka bir hatada süre akmaya devam eder, sinyal "kayıp" görünür.
    if (outcome === 'permission' && mounted.current) apply({ type: 'reset' });
  }, [apply, enqueueOp, now, openTracking]);

  const pause = useCallback(() => {
    if (stateRef.current.status !== 'running') return;
    const at = now();
    setTick(at);
    apply({ type: 'pause', now: at });
    void enqueueOp(closeTracking);
  }, [apply, closeTracking, enqueueOp, now]);

  const resume = useCallback(async () => {
    if (stateRef.current.status !== 'paused') return;
    const at = now();
    setTick(at);
    setError(null);
    apply({ type: 'resume', now: at });
    const outcome = await enqueueOp(openTracking);
    // Duraklatma sırasında izin geri alındıysa süre akmasın: duraklatılmış duruma dön.
    if (outcome === 'permission' && currentStatus() === 'running') {
      apply({ type: 'pause', now: now() });
    }
  }, [apply, currentStatus, enqueueOp, now, openTracking]);

  const finish = useCallback(() => {
    const status = stateRef.current.status;
    if (status !== 'running' && status !== 'paused') return;
    const at = now();
    setTick(at);
    apply({ type: 'finish', now: at });
    void enqueueOp(closeTracking);
  }, [apply, closeTracking, enqueueOp, now]);

  const restore = useCallback(
    (snapshot: TrackerSnapshot) => {
      setError(null);
      apply({ type: 'restore', snapshot });
    },
    [apply],
  );

  const snapshot = useCallback(() => toSnapshot(stateRef.current, now()), [now]);

  // Süre sayacı: çalışırken periyodik güncellenir (duraklatmada durur).
  useEffect(() => {
    if (state.status !== 'running') return;
    const id = setInterval(() => setTick(now()), tickMs);
    return () => clearInterval(id);
  }, [state.status, now, tickMs]);

  // Taslak: çalışırken periyodik, duraklatınca ve uygulama arka plana geçince hemen.
  const writeDraft = useCallback(
    (force: boolean) => {
      const current = stateRef.current;
      const write = persistRef.current;
      if (!write || current.distanceM <= 0) return;
      if (!force && current.points.length === persistedCount.current) return;
      const snap = toSnapshot(current, now());
      if (!snap) return;
      persistedCount.current = current.points.length;
      write(snap);
    },
    [now],
  );

  useEffect(() => {
    if (state.status !== 'running') return;
    const id = setInterval(() => writeDraft(false), persistEveryMs);
    return () => clearInterval(id);
  }, [state.status, writeDraft, persistEveryMs]);

  useEffect(() => {
    if (state.status === 'paused') writeDraft(true);
  }, [state.status, writeDraft]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') writeDraft(true);
    });
    return () => subscription.remove();
  }, [writeDraft]);

  const lastPoint = state.points[state.points.length - 1];
  const running = state.status === 'running';

  const gps: GpsState = !running
    ? 'idle'
    : state.points.length === 0
      ? state.lastAccuracyM !== null && state.lastAccuracyM > MAX_ACCURACY_M
        ? 'weak'
        : 'searching'
      : state.lastSampleAt !== null && tick - state.lastSampleAt > SIGNAL_LOST_AFTER_MS
        ? 'lost'
        : state.lastAccuracyM !== null && state.lastAccuracyM > MAX_ACCURACY_M
          ? 'weak'
          : 'good';

  const moving = running && lastPoint !== undefined && tick - lastPoint.t <= STATIONARY_AFTER_MS;
  const route = useMemo(() => state.points.map(({ lat, lng }) => ({ lat, lng })), [state.points]);
  const result = useMemo(() => (state.status === 'finished' ? buildResult(state) : null), [state]);

  return {
    status: state.status,
    elapsedSec: elapsedSec(state, tick),
    distanceKm: distanceKm(state),
    currentPace: moving ? state.paceSecPerKm : null,
    averagePace: avgPaceOf(state, tick),
    route,
    gps,
    error,
    background,
    result,
    start,
    pause,
    resume,
    finish,
    restore,
    snapshot,
  };
}

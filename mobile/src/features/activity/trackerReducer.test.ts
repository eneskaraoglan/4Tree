import { sampleAt, T0 } from './testing';
import {
  buildResult,
  distanceKm,
  elapsedSec,
  initialTrackerState,
  isSnapshot,
  MAX_ACCURACY_M,
  REANCHOR_AFTER_JUMPS,
  toSnapshot,
  trackerReducer,
  type TrackerAction,
  type TrackerState,
} from './trackerReducer';
import type { LocationSample } from './types';

function run(actions: TrackerAction[], from: TrackerState = initialTrackerState): TrackerState {
  return actions.reduce(trackerReducer, from);
}
const sample = (s: LocationSample): TrackerAction => ({ type: 'sample', sample: s });
const started = () => run([{ type: 'start', now: T0 }]);

describe('durum makinesi', () => {
  it('idle -> running -> paused -> running -> finished', () => {
    let state = initialTrackerState;
    expect(state.status).toBe('idle');
    state = trackerReducer(state, { type: 'start', now: T0 });
    expect(state.status).toBe('running');
    state = trackerReducer(state, { type: 'pause', now: T0 + 10_000 });
    expect(state.status).toBe('paused');
    state = trackerReducer(state, { type: 'resume', now: T0 + 20_000 });
    expect(state.status).toBe('running');
    state = trackerReducer(state, { type: 'finish', now: T0 + 30_000 });
    expect(state.status).toBe('finished');
  });

  it('geçersiz geçişler durumu değiştirmez', () => {
    const idle = initialTrackerState;
    expect(trackerReducer(idle, { type: 'pause', now: T0 })).toBe(idle);
    expect(trackerReducer(idle, { type: 'resume', now: T0 })).toBe(idle);
    expect(trackerReducer(idle, { type: 'finish', now: T0 })).toBe(idle);
    const running = started();
    expect(trackerReducer(running, { type: 'start', now: T0 + 1 })).toBe(running);
    expect(trackerReducer(running, { type: 'resume', now: T0 + 1 })).toBe(running);
    const finished = trackerReducer(running, { type: 'finish', now: T0 + 1000 });
    expect(trackerReducer(finished, { type: 'pause', now: T0 + 2000 })).toBe(finished);
    expect(trackerReducer(finished, sample(sampleAt(5, 10)))).toBe(finished);
  });

  it('süre sayacı duraklatmada durur, devamda kaldığı yerden sürer', () => {
    let state = started();
    expect(elapsedSec(state, T0 + 10_000)).toBe(10);
    state = trackerReducer(state, { type: 'pause', now: T0 + 10_000 });
    expect(elapsedSec(state, T0 + 60_000)).toBe(10);
    state = trackerReducer(state, { type: 'resume', now: T0 + 60_000 });
    expect(elapsedSec(state, T0 + 65_000)).toBe(15);
    state = trackerReducer(state, { type: 'finish', now: T0 + 70_000 });
    expect(state.activeMs).toBe(20_000);
    expect(elapsedSec(state, T0 + 999_000)).toBe(20);
  });

  it('duraklatılmışken gelen ölçümler yok sayılır', () => {
    let state = run([{ type: 'start', now: T0 }, sample(sampleAt(1, 0))]);
    state = trackerReducer(state, { type: 'pause', now: T0 + 2000 });
    const after = trackerReducer(state, sample(sampleAt(3, 50)));
    expect(after.points).toHaveLength(1);
    expect(after.distanceM).toBe(0);
  });
});

describe('mesafe', () => {
  it('ilk ölçüm çapa olur, mesafe sonraki hareketlerden toplanır (haversine)', () => {
    const state = run([
      { type: 'start', now: T0 },
      sample(sampleAt(1, 0)),
      sample(sampleAt(3, 5)),
      sample(sampleAt(5, 10)),
      sample(sampleAt(7, 15)),
    ]);
    expect(state.points).toHaveLength(4);
    expect(state.distanceM).toBeCloseTo(15, 0);
    expect(distanceKm(state)).toBeCloseTo(0.015, 3);
  });

  it('duruş gürültüsü (3 m altı) mesafeye eklenmez, çapa küçük adımları biriktirir', () => {
    const jitter = [0, 1, -1, 2, 0.5, -2, 1.5, 0].map((m, i) => sample(sampleAt(1 + i, m)));
    const still = run([{ type: 'start', now: T0 }, ...jitter]);
    expect(still.distanceM).toBe(0);
    // Yavaş yürüyüş: her ölçümde 1,4 m. Adımlar çapadan biriktiği için mesafe kaybolmaz.
    const slow = run([
      { type: 'start', now: T0 },
      ...Array.from({ length: 21 }, (_, i) => sample(sampleAt(1 + i, i * 1.4))),
    ]);
    expect(slow.distanceM).toBeGreaterThan(24);
    expect(slow.distanceM).toBeLessThan(29.5);
  });

  it('doğruluğu kötü ölçümleri (> 50 m) eler', () => {
    const state = run([
      { type: 'start', now: T0 },
      sample(sampleAt(1, 0)),
      sample(sampleAt(3, 40, { accuracyM: MAX_ACCURACY_M + 1 })),
      sample(sampleAt(5, 10)),
    ]);
    expect(state.points).toHaveLength(2);
    expect(state.distanceM).toBeCloseTo(10, 0);
    expect(state.lastAccuracyM).toBe(5);
  });

  it('doğruluk tam 50 m ise kabul edilir', () => {
    const state = run([
      { type: 'start', now: T0 },
      sample(sampleAt(1, 0, { accuracyM: MAX_ACCURACY_M })),
      sample(sampleAt(5, 30, { accuracyM: MAX_ACCURACY_M })),
    ]);
    expect(state.points).toHaveLength(2);
  });

  it('aşırı hız sıçramasını (> 45 km/s) eler, sonraki normal ölçüm devam eder', () => {
    const state = run([
      { type: 'start', now: T0 },
      sample(sampleAt(1, 0)),
      sample(sampleAt(3, 5)),
      // 2 sn'de 500 m: ışınlanma.
      sample(sampleAt(5, 505)),
      sample(sampleAt(7, 12)),
    ]);
    expect(state.points).toHaveLength(3);
    expect(state.distanceM).toBeCloseTo(12, 0);
    expect(state.jumpRejects).toBe(0);
  });

  it('art arda sıçramalar sürerse yeni konum gerçek sayılır: yeni bölüm, mesafe eklenmez', () => {
    const actions: TrackerAction[] = [{ type: 'start', now: T0 }, sample(sampleAt(1, 0)), sample(sampleAt(3, 5))];
    for (let i = 0; i < REANCHOR_AFTER_JUMPS; i++) actions.push(sample(sampleAt(5 + i * 2, 5000 + i * 3)));
    const state = run(actions);
    expect(state.segment).toBe(1);
    expect(state.distanceM).toBeCloseTo(5, 0);
    expect(state.anchor?.seg).toBe(1);
    // Yeni bölümden sonra normal hareket sayılır.
    const next = trackerReducer(state, sample(sampleAt(5 + REANCHOR_AFTER_JUMPS * 2, 5000 + 12 + 20)));
    expect(next.distanceM).toBeCloseTo(25, 0);
  });

  it('aynı ya da eski zaman damgalı yinelenen ölçüm atılır (ön plan + arka plan akışı)', () => {
    const state = run([
      { type: 'start', now: T0 },
      sample(sampleAt(1, 0)),
      sample(sampleAt(3, 10)),
      sample(sampleAt(3, 10)),
      sample(sampleAt(2, 6)),
    ]);
    expect(state.points).toHaveLength(2);
    expect(state.distanceM).toBeCloseTo(10, 0);
  });

  it('duraklatma sonrası ilk ölçüm yeni bölümün çapasıdır: aradaki yer değişikliği mesafeye girmez', () => {
    let state = run([{ type: 'start', now: T0 }, sample(sampleAt(1, 0)), sample(sampleAt(3, 10))]);
    state = trackerReducer(state, { type: 'pause', now: T0 + 4000 });
    state = trackerReducer(state, { type: 'resume', now: T0 + 600_000 });
    expect(state.segment).toBe(1);
    state = run([sample(sampleAt(601, 2000)), sample(sampleAt(603, 2008))], state);
    expect(state.distanceM).toBeCloseTo(18, 0);
    expect(state.points.map((p) => p.seg)).toEqual([0, 0, 1, 1]);
  });
});

describe('bayat ölçüm', () => {
  it('başlama anından önceki (önbellekteki) ölçüm elenir, sonrakiler kabul edilir', () => {
    const state = run([
      { type: 'start', now: T0 + 10_000 },
      sample(sampleAt(2, 0)),
      sample(sampleAt(11, 0)),
      sample(sampleAt(14, 12)),
    ]);
    expect(state.points).toHaveLength(2);
    expect(state.distanceM).toBeCloseTo(12, 0);
  });

  it('devamdan önce zaman damgalı ölçüm (duraklatma sırasında kuyruğa girmiş) elenir', () => {
    let state = run([{ type: 'start', now: T0 }, sample(sampleAt(1, 0)), sample(sampleAt(3, 10))]);
    state = trackerReducer(state, { type: 'pause', now: T0 + 4000 });
    state = trackerReducer(state, { type: 'resume', now: T0 + 60_000 });
    state = run([sample(sampleAt(30, 500)), sample(sampleAt(61, 20))], state);
    expect(state.points).toHaveLength(3);
    expect(state.points[2].lng).toBe(sampleAt(61, 20).lng);
  });
});

describe('tempo', () => {
  it('sabit 3 m/sn hızda yumuşatılmış anlık tempo yaklaşık 5:33', () => {
    const state = run([
      { type: 'start', now: T0 },
      ...Array.from({ length: 31 }, (_, i) => sample(sampleAt(1 + i, i * 3))),
    ]);
    expect(state.paceSecPerKm).toBeCloseTo(1000 / 3, 0);
  });

  it('duraklatınca anlık tempo sıfırlanır', () => {
    let state = run([{ type: 'start', now: T0 }, ...Array.from({ length: 15 }, (_, i) => sample(sampleAt(1 + i, i * 3)))]);
    expect(state.paceSecPerKm).not.toBeNull();
    state = trackerReducer(state, { type: 'pause', now: T0 + 20_000 });
    expect(state.paceSecPerKm).toBeNull();
  });
});

describe('taslak (snapshot)', () => {
  it('çalışırken ve duraklatılmışken anlık görüntü alınır, idle/finished için null', () => {
    const running = run([{ type: 'start', now: T0 }, sample(sampleAt(1, 0)), sample(sampleAt(3, 10))]);
    const snap = toSnapshot(running, T0 + 5000);
    expect(snap).not.toBeNull();
    expect(snap!.activeMs).toBe(5000);
    expect(snap!.points).toHaveLength(2);
    expect(isSnapshot(JSON.parse(JSON.stringify(snap)))).toBe(true);
    expect(toSnapshot(initialTrackerState, T0)).toBeNull();
    expect(toSnapshot(trackerReducer(running, { type: 'finish', now: T0 + 6000 }), T0)).toBeNull();
  });

  it('geri yüklenince duraklatılmış açılır ve devam edilebilir', () => {
    const running = run([{ type: 'start', now: T0 }, sample(sampleAt(1, 0)), sample(sampleAt(3, 10))]);
    const snap = toSnapshot(running, T0 + 5000)!;
    let restored = trackerReducer(initialTrackerState, { type: 'restore', snapshot: snap });
    expect(restored.status).toBe('paused');
    expect(elapsedSec(restored, T0 + 999_999)).toBe(5);
    expect(distanceKm(restored)).toBeCloseTo(0.01, 3);
    restored = trackerReducer(restored, { type: 'resume', now: T0 + 100_000 });
    expect(restored.status).toBe('running');
    expect(restored.segment).toBe(snap.segment + 1);
  });

  it('bozuk veriyi geçerli saymaz', () => {
    expect(isSnapshot(null)).toBe(false);
    expect(isSnapshot({ v: 2 })).toBe(false);
    expect(isSnapshot({ v: 1, startedAt: 1, activeMs: 1, distanceM: 1, segment: 0, points: [{ lat: 1 }] })).toBe(false);
  });
});

describe('buildResult', () => {
  it('süre, mesafe ve rotayı kaydedilebilir biçimde verir', () => {
    let state = run([{ type: 'start', now: T0 }, sample(sampleAt(1, 0)), sample(sampleAt(5, 20)), sample(sampleAt(9, 40))]);
    state = trackerReducer(state, { type: 'finish', now: T0 + 12_000 });
    const result = buildResult(state);
    expect(result.durationSec).toBe(12);
    expect(result.distanceKm).toBeCloseTo(0.04, 3);
    expect(result.route).toHaveLength(3);
    expect(result.startedAt).toBe(new Date(T0).toISOString());
  });
});

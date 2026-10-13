import {
  classifyActivity,
  MIN_CLASSIFY_MOVING_SEC,
  RUN_MIN_SPEED_KMH,
} from './classify';
import type { TrackPoint } from './types';

const METERS_PER_DEG_LAT = 111_320;

type Phase = { kmh: number; seconds: number };

/** Verilen hız evrelerini sırayla izleyen, saniyede bir ölçümlü rota. */
function route(phases: Phase[]): TrackPoint[] {
  const points: TrackPoint[] = [{ lat: 41, lng: 29, t: 0, seg: 0 }];
  let meters = 0;
  let t = 0;
  for (const { kmh, seconds } of phases) {
    for (let i = 0; i < seconds; i++) {
      meters += kmh / 3.6;
      t += 1000;
      points.push({ lat: 41 + meters / METERS_PER_DEG_LAT, lng: 29, t, seg: 0 });
    }
  }
  return points;
}

describe('classifyActivity', () => {
  it('eşik 7,0 km/s (varsayım) olarak tek yerde duruyor', () => {
    expect(RUN_MIN_SPEED_KMH).toBe(7.0);
  });

  it('yürüyüş: 5 km/s', () => {
    const result = classifyActivity(route([{ kmh: 5, seconds: 600 }]));
    expect(result.type).toBe('walk');
    expect(result.reliable).toBe(true);
    expect(result.avgSpeedKmh).toBeCloseTo(5, 1);
    expect(result.runShare).toBe(0);
  });

  it('hızlı yürüyüş (6,5 km/s) hala yürüyüş', () => {
    expect(classifyActivity(route([{ kmh: 6.5, seconds: 900 }])).type).toBe('walk');
  });

  it('koşu: 10 km/s', () => {
    const result = classifyActivity(route([{ kmh: 10, seconds: 600 }]));
    expect(result.type).toBe('run');
    expect(result.runShare).toBe(1);
    expect(result.avgSpeedKmh).toBeCloseTo(10, 1);
  });

  it('eşikte (7,0 km/s) koşu sayılır', () => {
    expect(classifyActivity(route([{ kmh: 7.0, seconds: 300 }])).type).toBe('run');
  });

  it('karışık, ağırlıklı koşu: 8 dk koşu + 2 dk yürüyüş = koşu', () => {
    const result = classifyActivity(
      route([
        { kmh: 5, seconds: 60 },
        { kmh: 10, seconds: 480 },
        { kmh: 5, seconds: 60 },
      ]),
    );
    expect(result.type).toBe('run');
    expect(result.runShare).toBeGreaterThan(0.6);
  });

  it('karışık, ağırlıklı yürüyüş: 2 dk koşu + 8 dk yürüyüş = yürüyüş', () => {
    const result = classifyActivity(
      route([
        { kmh: 5, seconds: 240 },
        { kmh: 10, seconds: 120 },
        { kmh: 5, seconds: 240 },
      ]),
    );
    expect(result.type).toBe('walk');
    expect(result.runShare).toBeLessThan(0.4);
  });

  it('ortalama hız eşiğin altında olsa da süre çoğunluğu koşuysa koşu (çoğunluk kuralı)', () => {
    // 6 dk @ 8 km/s + 4 dk @ 4 km/s: ortalama 6,4 km/s < 7 ama koşu süresi çoğunlukta.
    const result = classifyActivity(
      route([
        { kmh: 8, seconds: 360 },
        { kmh: 4, seconds: 240 },
      ]),
    );
    expect(result.avgSpeedKmh).toBeLessThan(RUN_MIN_SPEED_KMH);
    expect(result.type).toBe('run');
  });

  it('duran süre (trafik ışığı) türü bozmaz', () => {
    const run = route([{ kmh: 10, seconds: 120 }]);
    const last = run[run.length - 1];
    const standing: TrackPoint[] = Array.from({ length: 120 }, (_, i) => ({ ...last, t: last.t + (i + 1) * 1000 }));
    const result = classifyActivity([...run, ...standing]);
    expect(result.type).toBe('run');
    expect(result.avgSpeedKmh).toBeCloseTo(10, 0);
  });

  it('çok kısa aktivitede güvenilir değil, varsayılan yürüyüş', () => {
    const result = classifyActivity(route([{ kmh: 12, seconds: MIN_CLASSIFY_MOVING_SEC - 10 }]));
    expect(result.reliable).toBe(false);
    expect(result.type).toBe('walk');
  });

  it('hareketsiz (aynı yerde) güvenilir değil', () => {
    const still: TrackPoint[] = Array.from({ length: 300 }, (_, i) => ({ lat: 41, lng: 29, t: i * 1000, seg: 0 }));
    const result = classifyActivity(still);
    expect(result.reliable).toBe(false);
    expect(result.type).toBe('walk');
    expect(result.avgSpeedKmh).toBe(0);
  });

  it('boş girdide güvenilir değil', () => {
    expect(classifyActivity([])).toMatchObject({ type: 'walk', reliable: false });
  });

  it('bölüm sınırındaki sıçrama hıza katılmaz', () => {
    const a = route([{ kmh: 5, seconds: 300 }]);
    const b = route([{ kmh: 5, seconds: 300 }]).map((p) => ({ ...p, lat: p.lat + 0.5, t: p.t + 400_000, seg: 1 }));
    expect(classifyActivity([...a, ...b]).type).toBe('walk');
  });
});

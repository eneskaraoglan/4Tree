import { averagePace, formatPace, smoothPace, windowedPace } from './pace';
import type { TrackPoint } from './types';

const METERS_PER_DEG_LAT = 111_320;

/** Kuzeye düz giden noktalar: her saniye `speedMs` metre. */
function line(speedMs: number, seconds: number, seg = 0, t0 = 0): TrackPoint[] {
  return Array.from({ length: seconds + 1 }, (_, i) => ({
    lat: 41 + (i * speedMs) / METERS_PER_DEG_LAT,
    lng: 29,
    t: t0 + i * 1000,
    seg,
  }));
}

describe('formatPace', () => {
  it('"6:12" biçimi', () => {
    expect(formatPace(372)).toBe('6:12');
    expect(formatPace(300)).toBe('5:00');
    expect(formatPace(65)).toBe('1:05');
  });

  it('saniye yuvarlaması dakikaya taşar', () => {
    expect(formatPace(419.6)).toBe('7:00');
  });

  it('veri yoksa tire gösterir', () => {
    expect(formatPace(null)).toBe('–:––');
    expect(formatPace(0)).toBe('–:––');
    expect(formatPace(Number.NaN)).toBe('–:––');
  });
});

describe('averagePace', () => {
  it('süre / mesafe', () => {
    expect(averagePace(5, 1800)).toBe(360);
  });

  it('çok kısa mesafede ya da süresiz null', () => {
    expect(averagePace(0.01, 100)).toBeNull();
    expect(averagePace(2, 0)).toBeNull();
  });

  it('durmuş sayılacak kadar yavaşsa null', () => {
    expect(averagePace(0.1, 600)).toBeNull();
  });
});

describe('windowedPace', () => {
  it('sabit hızda doğru tempoyu verir (3 m/sn = 5:33 dk/km)', () => {
    const pace = windowedPace(line(3, 60));
    expect(pace).not.toBeNull();
    expect(pace!).toBeCloseTo(1000 / 3, 0);
  });

  it('sadece son 30 sn dikkate alınır: hız artınca tempo hızlanır', () => {
    const slow = line(1.5, 60);
    const last = slow[slow.length - 1];
    const fast: TrackPoint[] = Array.from({ length: 31 }, (_, i) => ({
      lat: last.lat + (i * 4) / METERS_PER_DEG_LAT,
      lng: 29,
      t: last.t + i * 1000,
      seg: 0,
    }));
    const pace = windowedPace([...slow, ...fast.slice(1)]);
    expect(pace!).toBeCloseTo(250, 0);
  });

  it('bölüm sınırını (duraklatma) aşmaz', () => {
    const before = line(3, 20, 0, 0);
    // Duraklatma sonrası uzak bir noktadan yeni bölüm: sıçrama tempoya girmemeli.
    const after = line(3, 10, 1, 25_000).map((p) => ({ ...p, lat: p.lat + 0.01 }));
    const pace = windowedPace([...before, ...after]);
    expect(pace!).toBeCloseTo(1000 / 3, 0);
  });

  it('yeterli veri yoksa null', () => {
    expect(windowedPace([])).toBeNull();
    expect(windowedPace(line(3, 2))).toBeNull();
    expect(windowedPace(line(0.05, 60))).toBeNull();
  });

});

describe('smoothPace', () => {
  it('önceki değer yoksa yeni değer aynen alınır', () => {
    expect(smoothPace(null, 330)).toBe(330);
  });

  it('tek ölçümdeki uç değeri bastırır: sıçramanın yarısından azı yansır', () => {
    const steady = smoothPace(smoothPace(null, 360), 360);
    const jumped = smoothPace(steady, 180);
    expect(360 - jumped).toBeLessThan(90);
    expect(jumped).toBeLessThan(360);
  });

  it('önceki ile yeni arasında kalır', () => {
    const next = smoothPace(400, 300);
    expect(next).toBeLessThan(400);
    expect(next).toBeGreaterThan(300);
  });
});

import { makeRoute, type RouteShape } from './routes';

type P = { lat: number; lng: number };

function haversineKm(a: P, b: P): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function lengthKm(route: P[]): number {
  let length = 0;
  for (let i = 1; i < route.length; i++) length += haversineKm(route[i - 1], route[i]);
  return length;
}

describe('makeRoute', () => {
  const center = { lat: 41.1775, lng: 28.979 };
  const shapes: RouteShape[] = ['loop', 'outAndBack', 'winding', 'blocks'];

  it.each(shapes)('%s: uzunluk hedef mesafeye yakın ve aynı tohumla deterministik', (shape) => {
    const route = makeRoute({ center, shape, distanceKm: 8, rotationDeg: 40, seed: 3 });
    expect(lengthKm(route)).toBeGreaterThan(8 * 0.97);
    expect(lengthKm(route)).toBeLessThan(8 * 1.03);
    expect(makeRoute({ center, shape, distanceKm: 8, rotationDeg: 40, seed: 3 })).toEqual(route);
  });

  it.each(shapes)('%s: farklı tohum farklı rota üretir', (shape) => {
    const a = makeRoute({ center, shape, distanceKm: 8, seed: 1 });
    const b = makeRoute({ center, shape, distanceKm: 8, seed: 2 });
    expect(a).not.toEqual(b);
  });

  it('merkez civarında kalır', () => {
    const route = makeRoute({ center, shape: 'loop', distanceKm: 5 });
    route.forEach((p) => expect(haversineKm(center, p)).toBeLessThan(3));
  });

  it.each(['loop', 'blocks'] as const)('%s: kapalı döngü, başlangıç = bitiş', (shape) => {
    for (const seed of [1, 4, 9]) {
      const route = makeRoute({ center, shape, distanceKm: 10, seed });
      expect(haversineKm(route[0], route[route.length - 1])).toBeLessThan(0.01);
      // Sap yok: rota hiçbir yerde başlangıca dönüp geri çekilmez; en uzak nokta yolun ortalarında.
      const far = route.reduce((best, p, i) => (haversineKm(route[0], p) > best.d ? { d: haversineKm(route[0], p), i } : best), { d: 0, i: 0 });
      expect(far.i).toBeGreaterThan(route.length * 0.25);
      expect(far.i).toBeLessThan(route.length * 0.75);
    }
  });

  it('loop: düzensiz ama köşeli değil (ardışık yön değişimi küçük)', () => {
    const route = makeRoute({ center, shape: 'loop', distanceKm: 10, seed: 5 });
    for (let i = 2; i < route.length; i++) {
      const a1 = Math.atan2(route[i - 1].lat - route[i - 2].lat, route[i - 1].lng - route[i - 2].lng);
      const a2 = Math.atan2(route[i].lat - route[i - 1].lat, route[i].lng - route[i - 1].lng);
      let turn = Math.abs(a2 - a1);
      if (turn > Math.PI) turn = 2 * Math.PI - turn;
      expect(turn).toBeLessThan(Math.PI / 4);
    }
  });

  it('outAndBack: başlangıca döner, gidiş ve dönüş yan yana ama aynı çizgi değil', () => {
    const distanceKm = 12;
    const route = makeRoute({ center, shape: 'outAndBack', distanceKm, seed: 2 });
    const n = route.length - 1;
    expect(haversineKm(route[0], route[n])).toBeLessThan(0.01);
    // Dönüş noktası ortada.
    const far = route.reduce((best, p, i) => (haversineKm(route[0], p) > best.d ? { d: haversineKm(route[0], p), i } : best), { d: 0, i: 0 });
    expect(far.i).toBeGreaterThan(n * 0.4);
    expect(far.i).toBeLessThan(n * 0.6);
    // i. nokta ile n-i. nokta yakın (aynı yol) ama çakışık değil (hafif kayık).
    let maxGap = 0;
    let minInteriorGap = Infinity;
    for (let i = 3; i < n / 2 - 3; i++) {
      const gap = haversineKm(route[i], route[n - i]);
      maxGap = Math.max(maxGap, gap);
      minInteriorGap = Math.min(minInteriorGap, gap);
    }
    expect(maxGap).toBeLessThan(distanceKm * 0.1);
    expect(minInteriorGap).toBeGreaterThan(0);
  });

  it('winding: noktadan noktaya, düz çizgi değil', () => {
    const route = makeRoute({ center, shape: 'winding', distanceKm: 9, seed: 6 });
    const chord = haversineKm(route[0], route[route.length - 1]);
    expect(chord).toBeGreaterThan(9 * 0.3);
    expect(lengthKm(route) / chord).toBeGreaterThan(1.25);
  });
});

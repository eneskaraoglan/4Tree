import type { RoutePoint } from '@/types';

/**
 * loop: göl/orman çevresinde düzensiz kapalı döngü
 * outAndBack: yol boyunca ileri, aynı yoldan hafif kayık geri
 * winding: kıvrımlı patika (S eğrileri), noktadan noktaya
 * blocks: yamuk dikdörtgen mahalle turu, köşeleri yumuşatılmış
 */
export type RouteShape = 'loop' | 'outAndBack' | 'winding' | 'blocks';

type Vec = { x: number; y: number };
type Rng = () => number;

const METERS_PER_DEG_LAT = 111_320;

/** Tohumlu, deterministik rastgele sayı üreteci (mulberry32). Aynı tohum, aynı rota. */
function createRng(seed: number): Rng {
  let s = (Math.imul(seed + 1, 0x9e3779b9) + 0x6d2b79f5) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (rng: Rng, min: number, max: number) => min + (max - min) * rng();

/** Hafif oval, düzensiz kapalı döngü. Kutupsal biçimde olduğu için kendini kesmez. */
function loopPath(count: number, rng: Rng): Vec[] {
  const aspect = between(rng, 0.62, 0.82);
  const harmonics = [2, 3, 4].map((k) => ({
    k,
    amp: between(rng, 0.03, 0.13) / (k - 1),
    phase: between(rng, 0, Math.PI * 2),
  }));
  const out: Vec[] = [];
  for (let i = 0; i <= count; i++) {
    const a = (i / count) * Math.PI * 2;
    const r = 1 + harmonics.reduce((s, h) => s + h.amp * Math.sin(h.k * a + h.phase), 0);
    out.push({ x: r * Math.cos(a), y: aspect * r * Math.sin(a) });
  }
  return out;
}

/** Eğri bir yol boyunca ileri ve geri; gidiş ve dönüş yan yana, uçlar yuvarlak. */
function outAndBackPath(count: number, rng: Rng): Vec[] {
  const amp = between(rng, 0.16, 0.26);
  const freq = between(rng, 0.8, 1.3);
  const phase = between(rng, 0, Math.PI * 2);
  const width = between(rng, 0.035, 0.055);
  const wobblePhase = between(rng, 0, Math.PI * 2);
  const side = rng() < 0.5 ? 1 : -1;
  const spine = (u: number) => amp * Math.sin(2 * Math.PI * freq * u + phase);
  const out: Vec[] = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const forward = t <= 0.5;
    const u = forward ? t * 2 : (1 - t) * 2;
    // sqrt(sin) uçlarda iki kolu yumuşak bir yay ile birleştirir.
    const w = width * Math.sqrt(Math.max(0, Math.sin(Math.PI * u)));
    const lateral = forward ? side * w : -side * (w + 0.012 * Math.sin(Math.PI * u) * Math.sin(9 * u + wobblePhase));
    out.push({ x: u, y: spine(u) + lateral });
  }
  return out;
}

/** İki frekanslı, genliği uçlarda azalan S eğrileri. */
function windingPath(count: number, rng: Rng): Vec[] {
  const f1 = between(rng, 1.4, 1.9);
  const f2 = between(rng, 3.1, 3.9);
  const p1 = between(rng, 0, Math.PI * 2);
  const p2 = between(rng, 0, Math.PI * 2);
  const amp = between(rng, 0.2, 0.28);
  const out: Vec[] = [];
  for (let i = 0; i <= count; i++) {
    const u = i / count;
    const envelope = 0.65 + 0.35 * Math.sin(Math.PI * u);
    const y = amp * envelope * (Math.sin(2 * Math.PI * f1 * u + p1) + 0.4 * Math.sin(2 * Math.PI * f2 * u + p2));
    out.push({ x: u + 0.025 * Math.sin(2 * Math.PI * 2.3 * u + p2), y });
  }
  return out;
}

function chaikinClosed(poly: Vec[], iterations: number): Vec[] {
  let current = poly;
  for (let it = 0; it < iterations; it++) {
    const next: Vec[] = [];
    current.forEach((p, i) => {
      const q = current[(i + 1) % current.length];
      next.push({ x: 0.75 * p.x + 0.25 * q.x, y: 0.75 * p.y + 0.25 * q.y });
      next.push({ x: 0.25 * p.x + 0.75 * q.x, y: 0.25 * p.y + 0.75 * q.y });
    });
    current = next;
  }
  return current;
}

/** Kapalı çokgeni yay uzunluğuna göre eşit aralıklı `count` noktaya (+ kapanış noktası) böler. */
function resampleClosed(poly: Vec[], count: number): Vec[] {
  const closed = [...poly, poly[0]];
  const cumulative = [0];
  for (let i = 1; i < closed.length; i++) {
    cumulative.push(cumulative[i - 1] + Math.hypot(closed[i].x - closed[i - 1].x, closed[i].y - closed[i - 1].y));
  }
  const total = cumulative[cumulative.length - 1];
  const out: Vec[] = [];
  let seg = 1;
  for (let i = 0; i < count; i++) {
    const target = (i / count) * total;
    while (cumulative[seg] < target) seg++;
    const span = cumulative[seg] - cumulative[seg - 1];
    const f = span === 0 ? 0 : (target - cumulative[seg - 1]) / span;
    out.push({
      x: closed[seg - 1].x + f * (closed[seg].x - closed[seg - 1].x),
      y: closed[seg - 1].y + f * (closed[seg].y - closed[seg - 1].y),
    });
  }
  out.push({ ...out[0] });
  return out;
}

/** Yamuk mahalle turu: sokak dönüşleri ve küçük bir sapma, köşeler Chaikin ile yumuşatılır. */
function blocksPath(count: number, rng: Rng): Vec[] {
  const j = () => between(rng, -0.04, 0.04);
  const polygon: Vec[] = [
    { x: 0 + j(), y: 0 + j() },
    { x: 0.45 + j(), y: 0.01 + j() },
    { x: 1 + j(), y: 0.08 + j() },
    { x: 1.04 + j(), y: 0.36 + j() },
    { x: 0.9 + j(), y: 0.4 + j() },
    { x: 0.9 + j(), y: 0.64 + j() },
    { x: 0.5 + j(), y: 0.58 + j() },
    { x: 0.06 + j(), y: 0.5 + j() },
  ];
  return resampleClosed(chaikinClosed(polygon, 3), count);
}

function shapePath(shape: RouteShape, count: number, rng: Rng): Vec[] {
  switch (shape) {
    case 'loop':
      return loopPath(count, rng);
    case 'outAndBack':
      return outAndBackPath(count, rng);
    case 'winding':
      return windingPath(count, rng);
    case 'blocks':
      return blocksPath(count, rng);
  }
}

function pathLength(path: Vec[]): number {
  let sum = 0;
  for (let i = 1; i < path.length; i++) {
    sum += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
  }
  return sum;
}

/**
 * Deterministik sahte rota üretir. Aynı (shape, seed) her zaman aynı rotayı verir.
 * Yol hedef mesafeye ölçeklenir; `rotationDeg` ile çevrilir. Kapalı şekillerde
 * (loop, blocks) ve gidiş-dönüşte son nokta başlangıçla aynıdır.
 */
export function makeRoute(options: {
  center: RoutePoint;
  shape: RouteShape;
  distanceKm: number;
  rotationDeg?: number;
  points?: number;
  seed?: number;
}): RoutePoint[] {
  const { center, shape, distanceKm, rotationDeg = 0, points = 72, seed = 0 } = options;
  const rng = createRng(seed);
  const path = shapePath(shape, points, rng);

  // GPS titremesi: sadece ara noktalara, başlangıç/bitiş noktası bozulmaz.
  const noise = shape === 'blocks' ? 0.002 : 0.004;
  const jittered = path.map((p, i) =>
    i === 0 || i === path.length - 1 ? p : { x: p.x + between(rng, -noise, noise), y: p.y + between(rng, -noise, noise) },
  );

  const scale = (distanceKm * 1000) / pathLength(jittered);
  const rot = (rotationDeg * Math.PI) / 180;
  const metersPerDegLng = METERS_PER_DEG_LAT * Math.cos((center.lat * Math.PI) / 180);

  // Şekli merkezine oturt.
  const cx = jittered.reduce((s, p) => s + p.x, 0) / jittered.length;
  const cy = jittered.reduce((s, p) => s + p.y, 0) / jittered.length;

  return jittered.map((p) => {
    const x = (p.x - cx) * scale;
    const y = (p.y - cy) * scale;
    const rx = x * Math.cos(rot) - y * Math.sin(rot);
    const ry = x * Math.sin(rot) + y * Math.cos(rot);
    return {
      lat: Number((center.lat + ry / METERS_PER_DEG_LAT).toFixed(5)),
      lng: Number((center.lng + rx / metersPerDegLng).toFixed(5)),
    };
  });
}

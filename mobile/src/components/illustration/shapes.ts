/**
 * SVG yol (path) üreticileri. 'worklet' işaretli olanlar hem JS hem UI thread'de çalışır;
 * böylece animasyonlu ve statik çizim aynı geometriyi kullanır.
 */

export type Pt = readonly [number, number];

function fmt(v: number): string {
  'worklet';
  return String(Math.round(v * 100) / 100);
}

/**
 * Düz [x0, y0, x1, y1, ...] noktalarından kapalı şekil yolu.
 * Şekil (cx, cy) çevresinde `scale` ile büyür/küçülür.
 * smooth: orta nokta kuadratik eğri, yumuşak yaprak öbeği.
 * Aksi halde düz kenarlı çokgen (çam katları).
 */
export function closedShapePath(
  pts: readonly number[],
  cx: number,
  cy: number,
  scale: number,
  smooth: boolean,
): string {
  'worklet';
  const n = pts.length / 2;
  if (n < 3) return '';
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < n; i += 1) {
    xs.push(cx + (pts[i * 2] - cx) * scale);
    ys.push(cy + (pts[i * 2 + 1] - cy) * scale);
  }
  if (!smooth) {
    let d = `M${fmt(xs[0])} ${fmt(ys[0])}`;
    for (let i = 1; i < n; i += 1) d += `L${fmt(xs[i])} ${fmt(ys[i])}`;
    return `${d}Z`;
  }
  const last = n - 1;
  let d = `M${fmt((xs[last] + xs[0]) / 2)} ${fmt((ys[last] + ys[0]) / 2)}`;
  for (let i = 0; i < n; i += 1) {
    const next = (i + 1) % n;
    d += `Q${fmt(xs[i])} ${fmt(ys[i])} ${fmt((xs[i] + xs[next]) / 2)} ${fmt((ys[i] + ys[next]) / 2)}`;
  }
  return `${d}Z`;
}

/** Açık, yumuşak eğri (tepe sırtı çizgisi). Noktalardan geçmez, orta noktalara yaklaşır. */
export function openCurvePath(points: readonly Pt[]): string {
  const n = points.length;
  if (n < 2) return '';
  let d = `M${fmt(points[0][0])} ${fmt(points[0][1])}`;
  for (let i = 1; i < n - 1; i += 1) {
    const mx = (points[i][0] + points[i + 1][0]) / 2;
    const my = (points[i][1] + points[i + 1][1]) / 2;
    d += `Q${fmt(points[i][0])} ${fmt(points[i][1])} ${fmt(mx)} ${fmt(my)}`;
  }
  d += `L${fmt(points[n - 1][0])} ${fmt(points[n - 1][1])}`;
  return d;
}

/** Elle çizilmiş gibi hafif düzensiz elips: merkez, yarıçaplar, nokta sayısı ve rastgelelik. */
export function wobblyEllipse(
  rng: () => number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  count = 9,
  jitter = 0.13,
): number[] {
  const out: number[] = [];
  const phase = rng() * Math.PI * 2;
  for (let i = 0; i < count; i += 1) {
    const a = phase + (i / count) * Math.PI * 2;
    const k = 1 + (rng() * 2 - 1) * jitter;
    out.push(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k);
  }
  return out;
}

/** Yerel ilerlemeyi (0-1) pencereye göre kırpar. Animasyon zaman çizelgesi için. */
export function windowProgress(t: number, start: number, end: number): number {
  'worklet';
  if (end <= start) return t >= end ? 1 : 0;
  const v = (t - start) / (end - start);
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

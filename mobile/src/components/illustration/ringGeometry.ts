import { createRng } from './random';
import { closedShapePath } from './shapes';

/** Halka çizimi 100x100 birimlik viewBox'ta yapılır; merkez (50, 50). */
export const RING_VIEWBOX = 100;
const CENTER = 50;
const OUTER_RADIUS = 44.4;
/** Her halkanın örnek sayısı. Eğri yumuşak olduğundan 56 nokta yeterli. */
const SAMPLES = 56;

export type RingShape = {
  /** Kapalı, hafif dalgalı yol. Başlangıç noktası saat 12 yönü, saat yönünde. */
  d: string;
  /** Dash hesabı için yol uzunluğu (çevrenin biraz üstü). */
  length: number;
  /** Saat 12'den saat yönünde (SAMPLES + 1) noktanın düz [x, y, ...] listesi. */
  points: number[];
  /** Soluk (tamamlanmamış) halkanın çizgi kalınlığı: "iyi yıl" halkaları kalın, sıkışık yıllar ince. */
  strokeWidth: number;
  /** İlerleme yayının kalınlığı. */
  fillWidth: number;
  /** Soluk halkadaki küçük kopukluk: [başlangıç, uzunluk], çevrenin oranı olarak. Yoksa null. */
  gap: readonly [number, number] | null;
};

export type RingsGeometry = {
  rings: RingShape[];
  rim: string;
  /** Kabuk dokusu: kabuğun dışına ve içine kısa çizgiler. */
  bark: string;
  pith: string;
  /** Merkezden dışa ince radyal çatlak ve iki küçük dalı. */
  crack: string;
  /** Tüm halkaların noktaları art arda: halka k, nokta j -> ((k * (SAMPLES + 1)) + j) * 2. */
  table: number[];
  samples: number;
  holeRadius: number;
};

type Params = { count: number; holeRatio: number; seed: number };

const TAU = Math.PI * 2;

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Elle çizilmiş, gerçek ağaç kesitine benzeyen halkalar:
 * - Aralıklar değişkendir: geniş "iyi yıl" kuşakları ve sıkışık ince halkalar bir arada.
 * - Büyüme tek yöne kayar (halkalar eş merkezli değil, yumurta gibi), her halkanın dalgası komşusuna yakındır.
 * - Çizgi kalınlığı kuşağın genişliğiyle birlikte değişir; bazı soluk halkalarda küçük kopukluklar var.
 * - Kabukta kısa çatlak dokusu, merkezden dışa ince bir radyal çatlak.
 * Aynı tohum her zaman aynı çizimi verir.
 */
export function buildRingsGeometry({ count, holeRatio, seed }: Params): RingsGeometry {
  const rng = createRng(seed);
  const holeRadius = CENTER * holeRatio;
  const total = OUTER_RADIUS - holeRadius - 0.8;
  const inner = holeRadius + 0.4;

  // Kuşak genişlikleri: yavaş salınan "iyi/kötü yıl" zarfı + gürültü, toplamı büyüme alanına ölçeklenir.
  const envelopePhase = rng() * TAU;
  const raw = Array.from({ length: count }, (_, k) => {
    const envelope = 0.5 + 0.5 * Math.sin(k * 1.25 + envelopePhase);
    let w = 0.42 + 1.6 * Math.pow(envelope, 1.4) * (0.55 + 0.9 * rng());
    if (rng() < 0.2) w *= 0.62;
    return Math.max(0.3, w);
  });

  // Tek yöne kayan büyüme: m(theta) bir tarafta kuşağı genişletir, karşı tarafta daraltır.
  const e1 = 0.07 + rng() * 0.05;
  const e2 = 0.03 + rng() * 0.03;
  const t1 = rng() * TAU;
  const t2 = rng() * TAU;
  const growth = (theta: number) => 1 + e1 * Math.cos(theta - t1) + e2 * Math.cos(2 * theta - t2);
  const scale = (0.99 * total) / raw.reduce((a, b) => a + b, 0) / (1 + e1 + e2);
  const widths = raw.map((w) => w * scale);
  const meanWidth = total / count;

  let phase1 = rng() * TAU;
  let phase2 = rng() * TAU;
  let phase3 = rng() * TAU;
  let phase4 = rng() * TAU;
  let ox = 0;
  let oy = 0;
  let edge = 0;

  const rings: RingShape[] = [];
  const table: number[] = [];

  for (let k = 0; k < count; k += 1) {
    const width = widths[k];
    const centerOffset = edge + width / 2;
    edge += width;
    phase1 += (rng() - 0.5) * 0.7;
    phase2 += (rng() - 0.5) * 0.7;
    phase3 += (rng() - 0.5) * 0.7;
    phase4 += (rng() - 0.5) * 0.9;
    ox += (rng() - 0.5) * 0.3;
    oy += (rng() - 0.5) * 0.3;
    const narrowest = Math.min(widths[Math.max(0, k - 1)], width, widths[Math.min(count - 1, k + 1)]);
    const amp = narrowest * (0.3 + rng() * 0.15);

    const points: number[] = [];
    for (let j = 0; j <= SAMPLES; j += 1) {
      const theta = -Math.PI / 2 + (j / SAMPLES) * TAU;
      const wobble =
        amp *
        (0.5 * Math.sin(2 * theta + phase1) +
          0.28 * Math.sin(3 * theta + phase2) +
          0.14 * Math.sin(5 * theta + phase3) +
          0.08 * Math.sin(8 * theta + phase4));
      const r = inner + centerOffset * growth(theta) + wobble;
      points.push(CENTER + ox + Math.cos(theta) * r, CENTER + oy + Math.sin(theta) * r);
    }
    // Kapalı yol için son nokta (ilkiyle aynı) atılır.
    const closed = points.slice(0, SAMPLES * 2);
    let perimeter = 0;
    for (let j = 0; j < SAMPLES; j += 1) {
      const next = (j + 1) % SAMPLES;
      perimeter += Math.hypot(closed[next * 2] - closed[j * 2], closed[next * 2 + 1] - closed[j * 2 + 1]);
    }
    const relative = width / meanWidth;
    const strokeWidth = clamp(0.36 + 0.5 * relative * (0.7 + rng() * 0.6), 0.35, 1.7);
    const hasGap = rng() < 0.4;
    const gapStart = rng();
    const gapLength = 0.03 + rng() * 0.05;
    rings.push({
      d: closedShapePath(closed, CENTER, CENTER, 1, true),
      length: perimeter * 1.01,
      points,
      strokeWidth,
      fillWidth: clamp(strokeWidth * 1.1, 0.6, 1.8),
      gap: hasGap ? [gapStart, gapLength] : null,
    });
    table.push(...points);
  }

  // Kabuk: en dış kuşağı izleyen, ince dişli kalın halka; üstünde ve içinde kısa çatlak çizgileri.
  const lastCenter = edge - widths[count - 1] / 2;
  const rimBase = (theta: number) => inner + lastCenter * growth(theta) + 1.2;
  const rimPhaseA = rng() * TAU;
  const rimPhaseB = rng() * TAU;
  const rimRadius = (theta: number) =>
    rimBase(theta) + 0.35 * Math.sin(5 * theta + rimPhaseA) + 0.2 * Math.sin(11 * theta + rimPhaseB);
  const rimPoints: number[] = [];
  const RIM_SAMPLES = 72;
  for (let j = 0; j < RIM_SAMPLES; j += 1) {
    const theta = (j / RIM_SAMPLES) * TAU;
    const r = rimRadius(theta);
    rimPoints.push(CENTER + ox + Math.cos(theta) * r, CENTER + oy + Math.sin(theta) * r);
  }
  let bark = '';
  for (let i = 0; i < 36; i += 1) {
    const theta = rng() * TAU;
    const r0 = rimRadius(theta) + (rng() < 0.7 ? 0.5 : -0.6);
    const r1 = r0 + (r0 > rimRadius(theta) ? 0.7 + rng() * 1.4 : -(0.5 + rng() * 0.8));
    const drift = (rng() - 0.5) * 0.04;
    bark += `M${(CENTER + ox + Math.cos(theta) * r0).toFixed(2)} ${(CENTER + oy + Math.sin(theta) * r0).toFixed(2)}`;
    bark += `L${(CENTER + ox + Math.cos(theta + drift) * r1).toFixed(2)} ${(CENTER + oy + Math.sin(theta + drift) * r1).toFixed(2)}`;
  }

  // Öz: merkezdeki hafif koyu, düzensiz leke.
  const pithPoints: number[] = [];
  const pithPhase = rng() * TAU;
  for (let j = 0; j < 28; j += 1) {
    const theta = (j / 28) * TAU;
    const r = holeRadius * (0.93 + 0.02 * Math.sin(3 * theta + pithPhase));
    pithPoints.push(CENTER + Math.cos(theta) * r, CENTER + Math.sin(theta) * r);
  }

  // Radyal çatlak: öz kenarından dışa, hafif kıvrık; iki küçük dalı var.
  const crackAngle = rng() * TAU;
  const steps = 14;
  const stepLength = (total * 0.88) / steps;
  let crack = '';
  const crackPoints: [number, number, number][] = [];
  let angle = crackAngle;
  for (let s = 0; s <= steps; s += 1) {
    angle += (rng() - 0.5) * 0.035;
    const r = holeRadius + 0.6 + s * stepLength;
    const x = CENTER + ox * 0.5 + Math.cos(angle) * r + (rng() - 0.5) * 0.25;
    const y = CENTER + oy * 0.5 + Math.sin(angle) * r + (rng() - 0.5) * 0.25;
    crackPoints.push([x, y, angle]);
    crack += `${s === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  for (let b = 0; b < 2; b += 1) {
    const at = crackPoints[4 + Math.floor(rng() * 8)];
    const dir = at[2] + (rng() < 0.5 ? -1 : 1) * (0.5 + rng() * 0.4);
    const len = 3 + rng() * 2.5;
    crack += `M${at[0].toFixed(2)} ${at[1].toFixed(2)}`;
    crack += `L${(at[0] + Math.cos(dir) * len * 0.5 + (rng() - 0.5) * 0.4).toFixed(2)} ${(at[1] + Math.sin(dir) * len * 0.5).toFixed(2)}`;
    crack += `L${(at[0] + Math.cos(dir) * len).toFixed(2)} ${(at[1] + Math.sin(dir) * len).toFixed(2)}`;
  }

  return {
    rings,
    rim: closedShapePath(rimPoints, CENTER, CENTER, 1, true),
    bark,
    pith: closedShapePath(pithPoints, CENTER, CENTER, 1, true),
    crack,
    table,
    samples: SAMPLES,
    holeRadius,
  };
}

/**
 * İlerleme ucunun konumu: ilerleme halka sayısına bölünür, tamsayı kısım dolu halkaları,
 * kesir kısım şu anki halkanın dolu oranını verir. Sonuç [x, y] ya da ilerleme 0 ise null.
 */
export function tipPosition(
  table: readonly number[],
  samples: number,
  count: number,
  progress: number,
): readonly [number, number] | null {
  'worklet';
  if (!(progress > 0.0001)) return null;
  const scaled = Math.min(progress, 1) * count;
  const ring = Math.min(count - 1, Math.max(0, Math.ceil(scaled) - 1));
  const fill = Math.min(1, Math.max(0, scaled - ring));
  const exact = fill * samples;
  const j = Math.min(samples - 1, Math.floor(exact));
  const frac = exact - j;
  const base = ring * (samples + 1) * 2 + j * 2;
  const x = table[base] + (table[base + 2] - table[base]) * frac;
  const y = table[base + 1] + (table[base + 3] - table[base + 1]) * frac;
  return [x, y];
}

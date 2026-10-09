import { createRng } from './random';
import { openCurvePath, type Pt } from './shapes';

/** Orman sahnesinin sabit manzarası: tepeler her zaman aynıdır (ağaçlardan bağımsız). */
const TERRAIN_SEED = 20;

export const LAYER_COUNT = 5;
/** Katman sırtlarının sahne yüksekliğine oranı (0 = uzak ufuk, 4 = en yakın). */
const RIDGE_BASE = [0.5, 0.6, 0.7, 0.8, 0.9] as const;
const RIDGE_AMPLITUDE = [0.055, 0.06, 0.055, 0.055, 0.045] as const;
/** Katman başına ağaç boyunun sahne yüksekliğine oranı. */
export const LAYER_TREE_SIZE = [0.17, 0.21, 0.26, 0.31, 0.37] as const;

type RidgeWave = { freq: number; phase: number; weight: number };

const waves: RidgeWave[][] = (() => {
  const rng = createRng(TERRAIN_SEED);
  return Array.from({ length: LAYER_COUNT }, () => [
    { freq: 0.7 + rng() * 0.5, phase: rng() * Math.PI * 2, weight: 0.5 },
    { freq: 1.6 + rng() * 0.8, phase: rng() * Math.PI * 2, weight: 0.3 },
    { freq: 3.1 + rng() * 1.2, phase: rng() * Math.PI * 2, weight: 0.2 },
  ]);
})();

/** Katmanın sırt çizgisinin y değeri (px). u: 0-1 yatay konum. */
export function ridgeY(layer: number, u: number, height: number): number {
  const base = RIDGE_BASE[layer] * height;
  const amp = RIDGE_AMPLITUDE[layer] * height;
  let sum = 0;
  for (const w of waves[layer]) sum += w.weight * Math.sin(u * Math.PI * 2 * w.freq + w.phase);
  return base - amp * (0.5 + 0.5 * sum);
}

/** Bir katmandan bir sonraki katmana (ya da sahne altına) kadar ağaçların durabileceği dikey bant (px). */
export function layerBand(layer: number, height: number): number {
  const next = layer + 1 < LAYER_COUNT ? RIDGE_BASE[layer + 1] : 1;
  return Math.max(0, (next - RIDGE_BASE[layer]) * height);
}

export type HillShape = {
  /** Dolgu için kapalı yol (sırt + alt kenarlar). */
  fill: string;
  /** Işık vuran sırt çizgisi. */
  ridge: string;
};

/**
 * Tepe şekli. Uzak iki katmanda sırt, ibreli ağaç dizisi gibi tırtıklı çizilir;
 * yakın katmanlarda yumuşak, elle çizilmiş bir eğridir.
 */
export function buildHill(layer: number, width: number, height: number): HillShape {
  const jagged = layer <= 1;
  const rng = createRng(TERRAIN_SEED + layer * 31);
  const step = jagged ? (layer === 0 ? 7 : 9) : Math.max(18, width / 22);
  const count = Math.ceil(width / step) + 1;
  const pts: Pt[] = [];
  for (let i = 0; i < count; i += 1) {
    const x = Math.min(width, i * step);
    const y = ridgeY(layer, width > 0 ? x / width : 0, height);
    // Çift indeksler "ağaç ucu", tek indeksler vadi: sivri, düzensiz ağaç silüeti.
    const tooth = jagged && i % 2 === 0 ? (2.2 + rng() * 4.2) * (layer === 0 ? 0.8 : 1) : 0;
    pts.push([x, y - tooth]);
  }
  let ridge: string;
  if (jagged) {
    ridge = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
  } else {
    ridge = openCurvePath(pts);
  }
  const last = pts[pts.length - 1];
  const fill = `${ridge}L${last[0].toFixed(1)} ${height}L0 ${height}Z`;
  return { fill, ridge };
}

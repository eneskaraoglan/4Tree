/** Dönüşüm kuralı: 20 km = 1 ağaç (architecture.md karar günlüğü). */
export const KM_PER_TREE = 20;

/** Kayan nokta sapmasını gidermek için mesafe 1e-6 km (1 mm) hassasiyetine oturtulur. */
const PRECISION = 1e6;
const snap = (value: number): number => Math.round(value * PRECISION) / PRECISION;

function normalizeKm(km: number): number {
  if (!Number.isFinite(km) || km < 0) {
    throw new RangeError(`Mesafe geçersiz: ${km}`);
  }
  return snap(km);
}

/** Mesafeden kazanılan tam ağaç sayısı. */
export function kmToTrees(km: number): number {
  return Math.floor(normalizeKm(km) / KM_PER_TREE);
}

/** Mevcut dilimde alınan mesafe (km), 0 ile 20 arası (20 hariç). */
function kmIntoSlice(km: number): number {
  return snap(normalizeKm(km) % KM_PER_TREE);
}

/** Bir sonraki ağaca kalan km (tam sınırda yeni dilim başladığı için 20). */
export function kmToNextTree(totalKm: number): number {
  return snap(KM_PER_TREE - kmIntoSlice(totalKm));
}

/** Mevcut 20 km'lik dilimde ilerleme, 0 (dahil) ile 1 (hariç) arası. */
export function progressToNextTree(totalKm: number): number {
  return kmIntoSlice(totalKm) / KM_PER_TREE;
}

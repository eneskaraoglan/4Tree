/**
 * Ağaç başına yıllık yaklaşık CO₂ tutumu (kg). Sabit bir tahmindir, ölçüm değildir.
 * Backend notu: gerçek hesap (tür, bölge, yaş) sunucu tarafında yapılmalı; şimdilik istemcide sabit.
 */
export const CO2_KG_PER_TREE_PER_YEAR = 22;

/** Ağaç sayısından tahmini yıllık CO₂ (kg). Geçersiz ya da negatif sayı 0 verir. */
export function estimateCo2Kg(treeCount: number): number {
  if (!Number.isFinite(treeCount) || treeCount <= 0) return 0;
  return Math.round(treeCount) * CO2_KG_PER_TREE_PER_YEAR;
}

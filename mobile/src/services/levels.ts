import type { LevelName, LevelProgress } from '@/types';

import { KM_PER_TREE } from './conversion';

/**
 * Seviyeye girmek için gereken en az ağaç sayısı.
 * VARSAYIM, backend notu: eşikler henüz onaylanmadı; gerçek değerler ve seviye hesabı sunucudan gelmeli.
 */
export const LEVEL_MIN_TREES: Record<LevelName, number> = {
  seed: 0,
  sapling: 3,
  tree: 10,
  forest: 25,
};

const ORDER: LevelName[] = ['seed', 'sapling', 'tree', 'forest'];

/** Toplam km'den seviye ve sonraki seviyeye sürekli (kesirli) ilerleme. */
export function getLevelProgress(totalKm: number): LevelProgress {
  if (!Number.isFinite(totalKm) || totalKm < 0) {
    throw new RangeError(`Mesafe geçersiz: ${totalKm}`);
  }
  // Seviye tam ağaçla belirlenir, ilerleme kesirli ağaçla sürekli akar.
  const trees = totalKm / KM_PER_TREE;
  let index = 0;
  ORDER.forEach((name, i) => {
    if (trees >= LEVEL_MIN_TREES[name]) index = i;
  });
  const level = ORDER[index];
  const nextLevel = ORDER[index + 1] ?? null;
  if (!nextLevel) return { level, nextLevel: null, progress: 1 };
  const from = LEVEL_MIN_TREES[level];
  const to = LEVEL_MIN_TREES[nextLevel];
  return { level, nextLevel, progress: (trees - from) / (to - from) };
}

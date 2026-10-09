/**
 * VARSAYIM: seviye eşikleri (LEVEL_MIN_TREES) servisten gelmeli; burada istemcide geri hesaplanıyor.
 * Backend notu: LevelProgress'e `treesToNext` alanı eklenmeli (bir sonraki seviyeye kalan tam ağaç sayısı).
 */
import { LEVEL_MIN_TREES } from '@/services';
import type { LevelName, LevelProgress } from '@/types';

/** Yolda soldan sağa sıra (gerçekten sıralı olduğu için numara gerekmez). */
export const LEVEL_ORDER: readonly LevelName[] = ['seed', 'sapling', 'tree', 'forest'];

/**
 * Bir sonraki seviyeye kaç ağaç kaldığı (tam sayı, yukarı yuvarlanır, en az 1).
 * Eşikler levels.ts'ten gelir; ilerleme kesirli ağaçtan türediği için eşik farkıyla geri çevrilir.
 * Son seviyede null.
 */
export function treesToNextLevel(level: LevelProgress): number | null {
  if (!level.nextLevel) return null;
  const span = LEVEL_MIN_TREES[level.nextLevel] - LEVEL_MIN_TREES[level.level];
  const remaining = (1 - level.progress) * span;
  // 1e-6: kayan nokta artığı (örn. 3.0000000001) yüzünden fazladan bir ağaç göstermeyi önler.
  return Math.max(1, Math.ceil(remaining - 1e-6));
}

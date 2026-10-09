import type { Activity, ForestTree } from '@/types';

const SPECIES = ['Meşe', 'Kızılçam', 'Kayın', 'Fıstık çamı', 'Karaçam', 'Zeytin', 'Kızılağaç'];
const REGIONS = ['Kaz Dağları', 'Bolu', 'Ege kıyısı', 'Belgrad Ormanı'];
/** Temsili sponsor adları; gerçek marka değildir. */
const SPONSORS: (string | undefined)[] = ['Örnek Outdoor', undefined, 'Örnek Kahve Evi', undefined];

/** Aktivitelerin kazandırdığı ağaçlardan, yeniden eskiye sıralı temsili orman. */
export function buildMockTrees(activities: Activity[]): ForestTree[] {
  const trees: ForestTree[] = [];
  [...activities].reverse().forEach((activity) => {
    for (let i = 0; i < activity.treesEarned; i++) {
      const n = trees.length;
      trees.push({
        id: `tree-${n + 1}`,
        species: SPECIES[n % SPECIES.length],
        plantedAt: activity.startedAt,
        region: REGIONS[n % REGIONS.length],
        sponsor: SPONSORS[n % SPONSORS.length],
        certificateNo: `ORNEK-2026-${String(n + 1).padStart(4, '0')}`,
        isSample: true,
      });
    }
  });
  return trees.reverse();
}

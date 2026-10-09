import type { ForestTree } from '@/types';

export type RegionSummary = { name: string; treeCount: number };

/** Dikim bölgelerine göre ağaç sayısı; çoktan aza, eşitse ada göre (Türkçe) sıralı. */
export function summarizeRegions(trees: readonly ForestTree[]): RegionSummary[] {
  const counts = new Map<string, number>();
  for (const tree of trees) counts.set(tree.region, (counts.get(tree.region) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, treeCount]) => ({ name, treeCount }))
    .sort((a, b) => b.treeCount - a.treeCount || a.name.localeCompare(b.name, 'tr'));
}

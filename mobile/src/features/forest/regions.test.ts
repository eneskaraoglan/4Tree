import type { ForestTree } from '@/types';

import { summarizeRegions } from './regions';

const tree = (id: string, region: string): ForestTree => ({
  id,
  species: 'Meşe',
  plantedAt: '2026-10-09T06:40:00+03:00',
  region,
  certificateNo: id,
  isSample: true,
});

describe('summarizeRegions', () => {
  it('bölgeleri çoktan aza, eşitse ada göre sıralar', () => {
    const result = summarizeRegions([
      tree('1', 'Bolu'),
      tree('2', 'Belgrad Ormanı'),
      tree('3', 'Belgrad Ormanı'),
      tree('4', 'Ege kıyısı'),
    ]);
    expect(result).toEqual([
      { name: 'Belgrad Ormanı', treeCount: 2 },
      { name: 'Bolu', treeCount: 1 },
      { name: 'Ege kıyısı', treeCount: 1 },
    ]);
  });

  it('ağaç yoksa boş liste verir', () => {
    expect(summarizeRegions([])).toEqual([]);
  });
});

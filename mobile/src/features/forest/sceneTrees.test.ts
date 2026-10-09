import { TREE_SPECIES } from '@/components/illustration';
import type { ForestTree } from '@/types';

import { toSceneTree, toSceneTrees, toTreeSpecies } from './sceneTrees';

function makeTree(id: string, species: string): ForestTree {
  return {
    id,
    species,
    plantedAt: '2026-10-09T06:40:00+03:00',
    region: 'Belgrad Ormanı',
    certificateNo: 'ORNEK-2026-0001',
    isSample: true,
  };
}

jest.mock('react-native-reanimated', () =>
  jest.requireActual('@/components/illustration/reanimatedTestMock').createReanimatedMock(),
);

describe('toTreeSpecies', () => {
  it('bilinen türleri sabit eşler', () => {
    expect(toTreeSpecies('Meşe')).toBe('meşe');
    expect(toTreeSpecies('Kızılçam')).toBe('cam');
    expect(toTreeSpecies('Fıstık çamı')).toBe('cam');
    expect(toTreeSpecies('Zeytin')).toBe('çınar');
  });

  it('bilinmeyen tür her çağrıda aynı geçerli türü verir', () => {
    const first = toTreeSpecies('Ihlamur');
    expect(TREE_SPECIES).toContain(first);
    expect(toTreeSpecies('Ihlamur')).toBe(first);
  });
});

describe('toSceneTrees', () => {
  it('aynı ağaç aynı tohumu verir, farklı id farklı tohum', () => {
    expect(toSceneTree(makeTree('tree-1', 'Meşe')).seed).toBe(toSceneTree(makeTree('tree-1', 'Meşe')).seed);
    expect(toSceneTree(makeTree('tree-1', 'Meşe')).seed).not.toBe(toSceneTree(makeTree('tree-2', 'Meşe')).seed);
  });

  it('yeniden eskiye gelen listeyi eskiden yeniye çevirir', () => {
    const scene = toSceneTrees([makeTree('tree-3', 'Meşe'), makeTree('tree-2', 'Zeytin'), makeTree('tree-1', 'Karaçam')]);
    expect(scene.map((t) => t.id)).toEqual(['tree-1', 'tree-2', 'tree-3']);
    expect(scene.map((t) => t.species)).toEqual(['cam', 'çınar', 'meşe']);
  });
});

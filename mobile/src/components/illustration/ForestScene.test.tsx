import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ForestScene, MAX_SWAYING_TREES, TREE_SPECIES } from '@/components/illustration';

import {
  crownOverlap,
  FIRST_SWAYING_LAYER,
  layoutForest,
  selectSwayingTrees,
  type ForestTreeInput,
} from './forestLayout';
import { getMotionCalls, resetMotionCalls, setReducedMotion } from './reanimatedTestMock';

jest.mock('react-native-reanimated', () => jest.requireActual('./reanimatedTestMock').createReanimatedMock());

beforeEach(() => {
  setReducedMotion(false);
  resetMotionCalls();
});

function makeTrees(count: number): ForestTreeInput[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `tree-${i}`,
    species: TREE_SPECIES[i % TREE_SPECIES.length],
    seed: i * 17 + 3,
  }));
}

describe('ForestScene', () => {
  it('ağaç yokken boş durum sahnesini etiketiyle gösterir, düğme yok', async () => {
    await render(<ForestScene trees={[]} height={320} accessibilityLabel="Boş orman" />);

    expect(screen.getByRole('image', { name: 'Boş orman' })).toBeTruthy();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('30 ağacı her biri düğme olarak render eder', async () => {
    await render(<ForestScene trees={makeTrees(30)} height={380} onTreePress={jest.fn()} />);

    expect(screen.getAllByRole('button')).toHaveLength(30);
  });

  it('ağaca dokununca onTreePress id ile çağrılır; etiket tür adından ya da callback`ten gelir', async () => {
    const onTreePress = jest.fn();
    await render(
      <ForestScene
        trees={makeTrees(3)}
        height={320}
        onTreePress={onTreePress}
        treeAccessibilityLabel={(t) => `Ağaç ${t.id}`}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Ağaç tree-1' }));

    expect(onTreePress).toHaveBeenCalledTimes(1);
    expect(onTreePress).toHaveBeenCalledWith('tree-1');
  });

  it('dokunma alanı her ağaç için en az 44x44', async () => {
    await render(<ForestScene trees={makeTrees(12)} height={200} onTreePress={jest.fn()} />);

    for (const button of screen.getAllByRole('button')) {
      const style = StyleSheet.flatten(button.props.style);
      expect(style.width).toBeGreaterThanOrEqual(44);
      expect(style.height).toBeGreaterThanOrEqual(44);
    }
  });

  it('Reduce Motion açıkken de render olur', async () => {
    setReducedMotion(true);
    await render(<ForestScene trees={makeTrees(5)} height={300} onTreePress={jest.fn()} />);

    expect(screen.getAllByRole('button')).toHaveLength(5);
    expect(getMotionCalls()).toEqual({ animatedProps: 0, timing: 0, repeat: 0, sequence: 0 });
  });

  it('varsayılan ağaç etiketi Türkçe tür adıdır', async () => {
    await render(<ForestScene trees={[{ id: 'a', species: 'çınar', seed: 1 }, { id: 'b', species: 'meşe', seed: 2 }, { id: 'c', species: 'cam', seed: 3 }]} height={300} onTreePress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Çınar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Meşe' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Çam' })).toBeTruthy();
  });

  it('onTreePress yoksa ağaçlar düğme değildir; etiket verilmişse sahne tek görsel olarak okunur', async () => {
    await render(<ForestScene trees={makeTrees(6)} height={300} accessibilityLabel="Ormanın" />);

    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByRole('image', { name: 'Ormanın' })).toBeTruthy();
  });

  it('düğme ağaçlı sahnede kök erişilebilir grup olmaz (çocuklar odaklanabilsin)', async () => {
    await render(<ForestScene trees={makeTrees(3)} height={300} onTreePress={jest.fn()} accessibilityLabel="Ormanın" />);

    expect(screen.queryByRole('image', { name: 'Ormanın' })).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('ölçüm gelene kadar gizli kalır, ölçüm gelince görünür', async () => {
    await render(<ForestScene trees={makeTrees(4)} height={300} accessibilityLabel="sahne" />);
    const root = screen.getByLabelText('sahne');
    expect(StyleSheet.flatten(root.props.style).opacity).toBe(0);

    await fireEvent(root, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 300 } } });

    expect(StyleSheet.flatten(screen.getByLabelText('sahne').props.style).opacity).not.toBe(0);
  });

  it('30 ağaçta en çok MAX_SWAYING_TREES sallanır; swaying=false ve uzak katman durağan', async () => {
    await render(<ForestScene trees={makeTrees(30)} height={380} />);
    expect(getMotionCalls().repeat).toBeGreaterThan(0);
    expect(getMotionCalls().repeat).toBeLessThanOrEqual(MAX_SWAYING_TREES);

    resetMotionCalls();
    await render(<ForestScene trees={makeTrees(30)} height={380} swaying={false} />);
    expect(getMotionCalls().repeat).toBe(0);
  });
});

describe('ormanın yerleşimi', () => {
  const trees = makeTrees(24);

  it('aynı girdi aynı yerleşimi verir', () => {
    expect(layoutForest(trees, 390, 360)).toEqual(layoutForest(trees, 390, 360));
  });

  it('listenin sonuna ağaç eklemek önceki ağaçları oynatmaz', () => {
    const before = layoutForest(trees.slice(0, 10), 390, 360);
    const after = layoutForest(trees.slice(0, 11), 390, 360);
    for (const tree of before) {
      expect(after.find((t) => t.id === tree.id)).toEqual(tree);
    }
  });

  it('ağaçlar sahnenin içinde kalır, katmanlara dağılır ve boyları çeşitlidir', () => {
    const placed = layoutForest(trees, 390, 360);

    expect(placed).toHaveLength(24);
    for (const t of placed) {
      expect(t.x).toBeGreaterThan(0);
      expect(t.x).toBeLessThan(390);
      expect(t.baseY).toBeLessThanOrEqual(360);
      expect(t.size).toBeGreaterThanOrEqual(44);
    }
    expect(new Set(placed.map((t) => t.layer)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(placed.map((t) => t.size)).size).toBeGreaterThan(8);
  });

  it('uzak katman önce çizilir (çizim sırası katmana göre artar)', () => {
    const layers = layoutForest(trees, 390, 360).map((t) => t.layer);
    expect(layers).toEqual([...layers].sort((a, b) => a - b));
  });

  it('genişlik 0 iken boş döner', () => {
    expect(layoutForest(trees, 0, 360)).toEqual([]);
  });

  it('kenardaki ağaçların dokunma kutusu sahneden taşmaz (kırpılmaz)', () => {
    for (const t of layoutForest(makeTrees(30), 320, 300)) {
      const half = Math.max(t.size, 44) / 2;
      expect(t.x - half).toBeGreaterThanOrEqual(-0.001);
      expect(t.x + half).toBeLessThanOrEqual(320.001);
    }
  });

  it('30 ağaçta ortalama örtüşme düşüktür; aynı katmanda iç içe geçme az', () => {
    const placed = layoutForest(makeTrees(30), 390, 380);
    let sameSum = 0;
    let samePairs = 0;
    let anySum = 0;
    let anyPairs = 0;
    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        const o = crownOverlap(placed[i], placed[j]);
        anySum += o;
        anyPairs += 1;
        if (placed[i].layer === placed[j].layer) {
          sameSum += o;
          samePairs += 1;
        }
      }
    }
    expect(sameSum / samePairs).toBeLessThan(0.04);
    expect(anySum / anyPairs).toBeLessThan(0.03);
  });

  it('30 ağacın yerleşim hesabı 50 ms altında', () => {
    const input = makeTrees(30);
    const start = performance.now();
    layoutForest(input, 390, 380);
    expect(performance.now() - start).toBeLessThan(50);
  });

  it('sallanacak ağaçlar yalnızca yakın katmandan ve en çok MAX_SWAYING_TREES', () => {
    const placed = layoutForest(makeTrees(30), 390, 380);
    const ids = selectSwayingTrees(placed);

    expect(ids.size).toBeLessThanOrEqual(MAX_SWAYING_TREES);
    for (const t of placed.filter((p) => ids.has(p.id))) {
      expect(t.layer).toBeGreaterThanOrEqual(FIRST_SWAYING_LAYER);
    }
  });
});

import { render, screen } from '@testing-library/react-native';

import {
  SWAY_DEGREES,
  SWAY_PERIOD_MAX_MS,
  SWAY_PERIOD_MIN_MS,
  Tree,
  TREE_SPECIES,
  type TreeSpecies,
} from '@/components/illustration';

import { getMotionCalls, resetMotionCalls, setReducedMotion } from './reanimatedTestMock';
import { swayPlan } from './Tree';
import { buildTree } from './treeGeometry';

jest.mock('react-native-reanimated', () => jest.requireActual('./reanimatedTestMock').createReanimatedMock());

beforeEach(() => {
  setReducedMotion(false);
  resetMotionCalls();
});

function bounds(species: TreeSpecies, seed: number) {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const leaf of buildTree(species, seed).foliage) {
    leaf.pts.forEach((v, i) => (i % 2 === 0 ? xs : ys).push(v));
  }
  return { width: Math.max(...xs) - Math.min(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}

describe('Tree', () => {
  it.each(TREE_SPECIES)('%s türü çökmeden render olur', async (species) => {
    await render(<Tree species={species} seed={7} size={120} accessibilityLabel={`Ağaç: ${species}`} />);

    expect(screen.getByLabelText(`Ağaç: ${species}`)).toBeTruthy();
  });

  it('süs ağacı (etiketsiz) ekran okuyucudan gizlenir', async () => {
    await render(<Tree species="cam" seed={1} size={80} />);

    expect(screen.queryByRole('image')).toBeNull();
  });
});

describe('Tree hareketi', () => {
  it('sallanma genliği ±1.5° ve dönemi 4-6 sn', () => {
    expect(SWAY_DEGREES).toBe(1.5);
    expect(SWAY_PERIOD_MIN_MS).toBe(4000);
    expect(SWAY_PERIOD_MAX_MS).toBe(6000);
  });

  it('sallanma planı tohumludur: dönem aralıkta, başlangıç simetrik aralıkta, faz tohuma göre değişir', () => {
    const plans = Array.from({ length: 12 }, (_, seed) => swayPlan(seed));
    for (const plan of plans) {
      expect(plan.periodMs).toBeGreaterThanOrEqual(SWAY_PERIOD_MIN_MS);
      expect(plan.periodMs).toBeLessThanOrEqual(SWAY_PERIOD_MAX_MS);
      expect(Math.abs(plan.startAngle)).toBeLessThanOrEqual(SWAY_DEGREES);
      expect(plan.firstLegMs).toBeGreaterThanOrEqual(1);
      expect(plan.firstLegMs).toBeLessThanOrEqual(plan.periodMs / 2);
    }
    expect(swayPlan(5)).toEqual(swayPlan(5));
    // Aynı sahnedeki ağaçlar senkron sallanmasın: başlangıç açıları farklı olmalı.
    expect(new Set(plans.map((p) => p.startAngle.toFixed(3))).size).toBeGreaterThan(8);
    // Başlangıç iki yöne de düşer (aralık [-1.5, +1.5], tek yönlü değil).
    expect(plans.some((p) => p.startAngle < 0)).toBe(true);
    expect(plans.some((p) => p.startAngle > 0)).toBe(true);
  });

  it('sallanma açıkken sonsuz döngü başlar', async () => {
    await render(<Tree species="meşe" seed={3} size={100} />);

    expect(getMotionCalls().repeat).toBe(1);
  });

  it('swaying=false ve growIn=false iken animasyon kullanılmaz', async () => {
    await render(<Tree species="meşe" seed={3} size={100} swaying={false} />);

    expect(getMotionCalls()).toEqual({ animatedProps: 0, timing: 0, repeat: 0, sequence: 0 });
  });

  it('growIn açıkken animasyonlu çizim yolu kullanılır', async () => {
    await render(<Tree species="cam" seed={3} size={100} swaying={false} growIn />);

    expect(getMotionCalls().animatedProps).toBeGreaterThan(10);
  });

  it('Reduce Motion açıkken sallanma ve growIn kullanılmaz, statik ağaç çizilir', async () => {
    setReducedMotion(true);
    await render(<Tree species="çınar" seed={3} size={100} growIn accessibilityLabel="ağaç" />);

    expect(screen.getByLabelText('ağaç')).toBeTruthy();
    expect(getMotionCalls()).toEqual({ animatedProps: 0, timing: 0, repeat: 0, sequence: 0 });
  });
});

describe('ağaç geometrisi', () => {
  it('aynı tür ve tohum her seferinde aynı ağacı verir; farklı tohum farklı', () => {
    expect(buildTree('meşe', 12)).toEqual(buildTree('meşe', 12));
    expect(buildTree('meşe', 12).woodPath).not.toBe(buildTree('meşe', 13).woodPath);
  });

  it('üç türün siluetleri belirgin farklıdır: çam dar, meşe geniş ve alçak, çınar yüksek', () => {
    const seeds = [1, 2, 3, 4, 5, 6];
    const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
    const pine = seeds.map((s) => bounds('cam', s));
    const oak = seeds.map((s) => bounds('meşe', s));
    const plane = seeds.map((s) => bounds('çınar', s));

    expect(mean(pine.map((b) => b.width))).toBeLessThan(mean(oak.map((b) => b.width)) * 0.65);
    expect(mean(plane.map((b) => b.width))).toBeLessThan(mean(oak.map((b) => b.width)));
    expect(mean(pine.map((b) => b.top))).toBeLessThan(mean(oak.map((b) => b.top)));
    expect(mean(plane.map((b) => b.top))).toBeLessThan(mean(oak.map((b) => b.top)));
  });

  it('büyüme zaman çizelgesi 0-1 içinde ve gövde yapraklardan önce başlar', () => {
    for (const species of TREE_SPECIES) {
      const shape = buildTree(species, 9);
      const trunkStart = Math.min(...shape.strokes.map((s) => s.window[0]));
      const leafStart = Math.min(...shape.foliage.map((f) => f.window[0]));
      const ends = [...shape.strokes.map((s) => s.window[1]), ...shape.foliage.map((f) => f.window[1])];
      expect(trunkStart).toBe(0);
      expect(leafStart).toBeGreaterThan(trunkStart);
      expect(Math.max(...ends)).toBeLessThanOrEqual(1);
    }
  });

  it('sis oranı renkleri değiştirir', () => {
    expect(buildTree('çınar', 4, 0.4).foliage[0].fill).not.toBe(buildTree('çınar', 4, 0).foliage[0].fill);
  });
});

import { KM_PER_TREE, kmToNextTree, kmToTrees, progressToNextTree } from './conversion';

describe('conversion', () => {
  it('20 km = 1 ağaç', () => {
    expect(KM_PER_TREE).toBe(20);
  });

  describe('kmToTrees', () => {
    it.each([
      [0, 0],
      [0.5, 0],
      [19.99, 0],
      [20, 1],
      [39.99, 1],
      [40, 2],
      [147.6, 7],
    ])('%f km -> %i ağaç', (km, trees) => {
      expect(kmToTrees(km)).toBe(trees);
    });
  });

  describe('kmToNextTree', () => {
    it('0 km iken 20 km kalır', () => {
      expect(kmToNextTree(0)).toBe(20);
    });
    it('tam 20 km iken yeni dilim başlar, 20 km kalır', () => {
      expect(kmToNextTree(20)).toBe(20);
    });
    it('39.99 km iken 0.01 km kalır', () => {
      expect(kmToNextTree(39.99)).toBeCloseTo(0.01, 5);
    });
    it('147.6 km iken tam 12.4 km kalır', () => {
      expect(kmToNextTree(147.6)).toBe(12.4);
    });
  });

  describe('progressToNextTree', () => {
    it('0 km -> 0', () => {
      expect(progressToNextTree(0)).toBe(0);
    });
    it('tam 20 km -> 0 (yeni dilim)', () => {
      expect(progressToNextTree(20)).toBe(0);
    });
    it('10 km -> 0.5', () => {
      expect(progressToNextTree(10)).toBe(0.5);
    });
    it('39.99 km -> 1 den küçük', () => {
      const p = progressToNextTree(39.99);
      expect(p).toBeCloseTo(0.9995, 4);
      expect(p).toBeLessThan(1);
    });
    it('147.6 km -> 7.6 / 20', () => {
      expect(progressToNextTree(147.6)).toBeCloseTo(0.38, 10);
    });
  });

  describe('geçersiz girdi', () => {
    it.each([-1, -0.01, NaN, Infinity])('%f reddedilir', (km) => {
      expect(() => kmToTrees(km)).toThrow(RangeError);
      expect(() => kmToNextTree(km)).toThrow(RangeError);
      expect(() => progressToNextTree(km)).toThrow(RangeError);
    });
  });

  it('kalan km ve ilerleme birbiriyle tutarlı', () => {
    for (const km of [0, 3.3, 19.99, 20, 57.2, 147.6]) {
      expect(kmToNextTree(km) + progressToNextTree(km) * KM_PER_TREE).toBeCloseTo(KM_PER_TREE, 8);
    }
  });

  describe('kayan nokta güvenliği', () => {
    it('0.1 toplamı 200 kez = 20 km sayılır (19.999999999999996)', () => {
      const km = Array.from({ length: 200 }, () => 0.1).reduce((a, b) => a + b, 0);
      expect(km).not.toBe(20);
      expect(kmToTrees(km)).toBe(1);
      expect(kmToNextTree(km)).toBe(20);
      expect(progressToNextTree(km)).toBe(0);
    });

    it('0.1 + 0.2 benzeri toplamlar bozulmaz', () => {
      expect(kmToNextTree(0.1 + 0.2)).toBe(19.7);
      expect(kmToTrees(0.1 + 0.2)).toBe(0);
    });

    it('59.99999999999999 (60 km kayan nokta sapması) 3 ağaç sayılır', () => {
      expect(kmToTrees(59.99999999999999)).toBe(3);
      expect(kmToNextTree(59.99999999999999)).toBe(20);
    });

    it('gerçekten sınırın altındaki değerler (39.999) hâlâ altında kalır', () => {
      expect(kmToTrees(39.999)).toBe(1);
      expect(kmToNextTree(39.999)).toBe(0.001);
    });
  });
});

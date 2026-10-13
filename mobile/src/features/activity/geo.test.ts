import { decimate, haversineKm, haversineM } from './geo';

describe('haversine', () => {
  it('aynı noktada 0', () => {
    expect(haversineM({ lat: 41, lng: 29 }, { lat: 41, lng: 29 })).toBe(0);
  });

  it('1 derece enlem yaklaşık 111,19 km', () => {
    expect(haversineKm({ lat: 41, lng: 29 }, { lat: 42, lng: 29 })).toBeCloseTo(111.19, 1);
  });

  it('İstanbul-Ankara arası yaklaşık 350 km', () => {
    const km = haversineKm({ lat: 41.0082, lng: 28.9784 }, { lat: 39.9334, lng: 32.8597 });
    expect(km).toBeGreaterThan(340);
    expect(km).toBeLessThan(360);
  });

  it('simetriktir', () => {
    const a = { lat: 41.1, lng: 29.0 };
    const b = { lat: 41.2, lng: 29.1 };
    expect(haversineM(a, b)).toBeCloseTo(haversineM(b, a), 6);
  });
});

describe('decimate', () => {
  it('sınırın altındaysa aynı diziyi döner', () => {
    const items = [1, 2, 3];
    expect(decimate(items, 5)).toBe(items);
  });

  it('ilk ve son noktayı korur ve en fazla max öğe verir', () => {
    const items = Array.from({ length: 1000 }, (_, i) => i);
    const out = decimate(items, 100);
    expect(out).toHaveLength(100);
    expect(out[0]).toBe(0);
    expect(out[out.length - 1]).toBe(999);
  });
});

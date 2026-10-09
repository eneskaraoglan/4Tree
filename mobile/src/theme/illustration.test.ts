import { illustration, mixHex } from './illustration';

describe('illustration paleti (DESIGN.md v2)', () => {
  it('orman yeşili kademeleri, sonbahar vurguları ve gökyüzü uçları DESIGN.md ile aynı', () => {
    expect(illustration.forest).toEqual(['#1B3A2B', '#245238', '#2F6B45', '#4C8B52', '#8DBF6A']);
    expect(illustration.autumn).toEqual({ amber: '#D08A3C', rust: '#B5532E' });
    expect(illustration.sky.top).toBe('#2B4A43');
    expect(illustration.sky.horizon).toBe('#C9884A');
  });

  it('5 tepe katmanı ve katman başına sis oranı var; sis uzaktan yakına azalır', () => {
    expect(illustration.hills).toHaveLength(5);
    expect(illustration.hazeByLayer).toHaveLength(5);
    expect([...illustration.hazeByLayer]).toEqual([...illustration.hazeByLayer].sort((a, b) => b - a));
  });

  it('mixHex uçları korur, ortayı karıştırır ve oranı kırpar', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixHex('#102030', '#ffffff', 9)).toBe('#ffffff');
  });
});

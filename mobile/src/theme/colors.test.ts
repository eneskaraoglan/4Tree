import { colors } from './colors';

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('tema renk token değerleri (DESIGN.md v2)', () => {
  it('15 token adı ve değeri DESIGN.md ile aynıdır', () => {
    expect(colors).toEqual({
      canvas: '#0C1713',
      surface: '#13251D',
      surface2: '#1D372B',
      divider: '#2A4739',
      primary: '#8DBF6A',
      primaryPressed: '#76A656',
      primaryGlow: 'rgba(141,191,106,0.28)',
      onPrimary: '#0C1713',
      text: '#EEE9DA',
      textSecondary: '#A9B8A8',
      textTertiary: '#70857A',
      gold: '#E3A857',
      bark: '#A8754B',
      water: '#7FB7C9',
      danger: '#E5735F',
    });
  });
});

describe('tema renk kontrastı (WCAG AA 4.5:1)', () => {
  it.each([
    ['text', 'canvas'],
    ['text', 'surface'],
    ['textSecondary', 'canvas'],
    ['textSecondary', 'surface'],
    ['textTertiary', 'canvas'],
    ['primary', 'canvas'],
    ['onPrimary', 'primary'],
    ['onPrimary', 'primaryPressed'],
    ['gold', 'canvas'],
    ['danger', 'canvas'],
    ['water', 'canvas'],
    ['bark', 'canvas'],
  ] as const)('%s, %s üzerinde okunur', (fg, bg) => {
    expect(contrast(colors[fg], colors[bg])).toBeGreaterThanOrEqual(4.5);
  });
});

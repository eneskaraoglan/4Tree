/**
 * 4Tree renk token'ları. Kaynak: mobile/DESIGN.md v2 (gece ormanı, yaprak yeşili, huş beyazı).
 * Kullanım sınırı: textTertiary ve bark sadece canvas üzerinde WCAG AA'dır (4.6:1).
 * surface/surface2 üzerinde AA değildir; orada textTertiary ve bark ile metin yazılmaz
 * (bark dekoratif çizgi/dolgu olarak kullanılabilir). danger sadece canvas/surface üstünde metindir.
 */
export const colors = {
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
} as const;

export type ColorToken = keyof typeof colors;

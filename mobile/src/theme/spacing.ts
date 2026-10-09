/** 4 pt grid. Kaynak: mobile/DESIGN.md v2 "Biçim, boşluk, yüzey". */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 8,
  card: 16,
  sheet: 24,
  pill: 999,
} as const;

/** Dokunma hedefi ve ana kontrol yükseklikleri (dp). */
export const touch = {
  min: 44,
  /** Tab bar içerik yüksekliği (safe area hariç). */
  tabBar: 56,
  /** Ana CTA yüksekliği. */
  cta: 60,
} as const;

/** Ekran yan boşluğu. */
export const screenPadding = spacing.xl;

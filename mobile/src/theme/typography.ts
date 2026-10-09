import type { TextStyle } from 'react-native';

/** Font aileleri. Ağırlık aile adının içindedir; Android'de fontWeight ayrıca yazılmaz. */
export const fontFamily = {
  displayBold: 'BricolageGrotesque_700Bold',
  displayExtraBold: 'BricolageGrotesque_800ExtraBold',
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semiBold: 'Figtree_600SemiBold',
} as const;

/**
 * Tipografi ölçeği. Kaynak: mobile/DESIGN.md v2 "Tipografi".
 * Büyük harf yok; harf aralığı sadece büyük rakamlarda hafif negatif.
 */
export const typography = {
  timer: {
    fontFamily: fontFamily.displayExtraBold,
    fontSize: 76,
    lineHeight: 80,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  bigNumber: {
    fontFamily: fontFamily.displayBold,
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  title1: { fontFamily: fontFamily.displayExtraBold, fontSize: 30, lineHeight: 36 },
  title2: { fontFamily: fontFamily.displayBold, fontSize: 22, lineHeight: 28 },
  title3: { fontFamily: fontFamily.semiBold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24 },
  secondary: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 16 },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

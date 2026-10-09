import { screenPadding } from '@/theme';

import { LEVEL_ORDER } from './levelCopy';

/** Geniş ekranlarda (web, tablet) içerik bu genişlikten fazla yayılmaz. */
export const MAX_CONTENT_WIDTH = 560;

/** Ekran genişliğinden, yan boşluklar düşülmüş içerik genişliği. */
export function contentWidthFor(windowWidth: number): number {
  return Math.min(windowWidth, MAX_CONTENT_WIDTH) - screenPadding * 2;
}

const GLYPH_CURRENT_MAX = 84;
const GLYPH_OTHER_MAX = 56;
/** Dar ekranda (320 dp) bulunulan çizim komşu duraklara değmesin diye durak genişliğine göre sınırlanır. */
const CURRENT_PER_STOP = 1.1;
const OTHER_PER_STOP = 0.8;

/**
 * Seviye yolundaki çizim boyutları (dp): bulunulan seviye büyük, diğerleri küçük.
 * Dar ekranda çizimler komşu duraklara değmesin diye durak genişliğine göre sınırlanır.
 */
export function levelGlyphSizes(windowWidth: number): { currentSize: number; otherSize: number } {
  const stopWidth = contentWidthFor(windowWidth) / LEVEL_ORDER.length;
  return {
    currentSize: Math.floor(Math.min(GLYPH_CURRENT_MAX, stopWidth * CURRENT_PER_STOP)),
    otherSize: Math.floor(Math.min(GLYPH_OTHER_MAX, stopWidth * OTHER_PER_STOP)),
  };
}

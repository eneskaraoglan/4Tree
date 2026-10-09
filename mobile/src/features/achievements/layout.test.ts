import { contentWidthFor, levelGlyphSizes, MAX_CONTENT_WIDTH } from './layout';

describe('levelGlyphSizes', () => {
  it.each([
    // 280 dp: durak genişliği 60, ikisi de durağa göre sınırlanır.
    [280, 66, 48],
    // 320 dp: durak genişliği 70; bulunulan çizim 77 dp, durağa değmez.
    [320, 77, 56],
    // 360 dp: bulunulan seviye üst sınıra (84) ulaşır, diğerleri 56 sınırında.
    [360, 84, 56],
    // 560 dp ve üstü: içerik genişliği 560'ta durur, boyutlar üst sınırda kalır.
    [560, 84, 56],
    [1024, 84, 56],
  ])('%i dp ekranda bulunulan %i, diğerleri %i dp', (width, currentSize, otherSize) => {
    expect(levelGlyphSizes(width)).toEqual({ currentSize, otherSize });
  });

  it('çizimler durak genişliğini aşmaz, bulunulan seviye diğerlerinden büyüktür', () => {
    [280, 320, 360, 560].forEach((width) => {
      const stopWidth = contentWidthFor(width) / 4;
      const { currentSize, otherSize } = levelGlyphSizes(width);
      expect(currentSize).toBeLessThanOrEqual(stopWidth * 1.1);
      expect(otherSize).toBeLessThan(stopWidth);
      expect(currentSize).toBeGreaterThan(otherSize);
    });
  });
});

describe('contentWidthFor', () => {
  it('geniş ekranda içerik genişliği 560 ile sınırlıdır', () => {
    expect(contentWidthFor(2000)).toBe(contentWidthFor(MAX_CONTENT_WIDTH));
  });
});

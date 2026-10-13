import { assertZoneCapacity, hasForbiddenChar, MAX_ZONES_PER_USER, validateZone } from './privacyZoneRules';

const zone = { label: 'Ev', lat: 41, lng: 29, radiusM: 250 };

const INVISIBLE: [string, string][] = [
  ['U+200B', '​'], ['U+200C', '‌'], ['U+200D', '‍'], ['U+2060', '⁠'],
  ['U+2061', '⁡'], ['U+2062', '⁢'], ['U+2063', '⁣'], ['U+2064', '⁤'],
  ['U+FEFF', '﻿'], ['U+00AD', '­'], ['U+2028', ' '], ['U+2029', ' '],
  ['U+180E', '᠎'], ['U+034F', '͏'], ['U+3164', 'ㅤ'], ['U+FFA0', 'ﾠ'],
  ['etiket U+E0001', String.fromCodePoint(0xe0001)],
  ['etiket U+E0020', String.fromCodePoint(0xe0020)],
  ['etiket U+E007F', String.fromCodePoint(0xe007f)],
];

describe('hasForbiddenChar', () => {
  it.each(INVISIBLE)('görünmez karakter %s yakalanır', (_name, char) => {
    expect(hasForbiddenChar(`Ev${char}`)).toBe(true);
    expect(hasForbiddenChar(char)).toBe(true);
  });

  it('astral etiket karakteri sonrasındaki normal metinle karışmaz', () => {
    expect(hasForbiddenChar(`🌳${String.fromCodePoint(0xe0041)}`)).toBe(true);
    expect(hasForbiddenChar('Çığır 🌳 Şişli')).toBe(false);
    // Etiket aralığının hemen dışı (U+DFFFF/E0080) izinli
    expect(hasForbiddenChar(String.fromCodePoint(0xe0080))).toBe(false);
  });

  it('kontrol ve bidi karakterleri yakalanır', () => {
    ['\u0000', '\n', '\u007F', '\u0085', '‮', '⁦', '‎', '؜'].forEach((c) =>
      expect(hasForbiddenChar(`a${c}`)).toBe(true),
    );
  });
});

describe('validateZone', () => {
  it.each(INVISIBLE)('yalnız %s içeren etiket boş sayılır', (_name, char) => {
    expect(() => validateZone({ ...zone, label: ` ${char}${char} ` })).toThrow(
      expect.objectContaining({ code: 'invalid', message: 'Bölgeye bir ad ver.' }),
    );
  });

  it.each(INVISIBLE)('etiket içinde %s reddedilir', (_name, char) => {
    expect(() => validateZone({ ...zone, label: `E${char}v` })).toThrow(expect.objectContaining({ code: 'invalid' }));
  });

  it('geçerli etiketi kırpıp döner', () => {
    expect(validateZone({ ...zone, label: '  Spor salonu ' })).toBe('Spor salonu');
  });
});

describe('assertZoneCapacity', () => {
  it('sınıra ulaşınca invalid', () => {
    expect(() => assertZoneCapacity(MAX_ZONES_PER_USER - 1)).not.toThrow();
    expect(() => assertZoneCapacity(MAX_ZONES_PER_USER)).toThrow(expect.objectContaining({ code: 'invalid' }));
  });
});

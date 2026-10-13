import { parseLineString } from './supabaseGeography';

/** İki noktalı (0 0, 1 1) LineString'in elle yazılmış WKB/EWKB hex örnekleri. */
const LE = '0102000000' + '02000000' + '0000000000000000' + '0000000000000000' + '000000000000F03F' + '000000000000F03F';
const BE = '0000000002' + '00000002' + '0000000000000000' + '0000000000000000' + '3FF0000000000000' + '3FF0000000000000';
const EWKB_LE = '0102000020' + 'E6100000' + '02000000' + '0000000000000000' + '0000000000000000' + '000000000000F03F' + '000000000000F03F';
const EWKB_BE = '0020000002' + '000010E6' + '00000002' + '0000000000000000' + '0000000000000000' + '3FF0000000000000' + '3FF0000000000000';

const expected = [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }];

describe('parseLineString', () => {
  it('GeoJSON LineString [lng, lat] -> {lat, lng}', () => {
    expect(parseLineString({ type: 'LineString', coordinates: [[29, 41], [29.5, 41.5, 12]] })).toEqual([
      { lat: 41, lng: 29 },
      { lat: 41.5, lng: 29.5 },
    ]);
  });

  it.each([
    ['WKB little endian', LE],
    ['WKB big endian', BE],
    ['EWKB little endian + SRID 4326', EWKB_LE],
    ['EWKB big endian + SRID 4326', EWKB_BE],
    ['küçük harfli hex', LE.toLowerCase()],
  ])('hex %s', (_name, hex) => {
    expect(parseLineString(hex)).toEqual(expected);
  });

  it('gerçek koordinatları doğru okur (29.0 41.0)', () => {
    // 29.0 = 0x403D000000000000, 41.0 = 0x4044800000000000 (little endian baytlar)
    const hex = '0102000020E6100000' + '01000000' + '0000000000003D40' + '0000000000804440';
    expect(parseLineString(hex)).toEqual([{ lat: 41, lng: 29 }]);
  });

  it('null/undefined (rota yok) boş dizi döner', () => {
    expect(parseLineString(null)).toEqual([]);
    expect(parseLineString(undefined)).toEqual([]);
  });

  it.each([
    ['sayı', 42],
    ['bilinmeyen GeoJSON tipi', { type: 'Point', coordinates: [1, 2] }],
    ['bozuk GeoJSON koordinat', { type: 'LineString', coordinates: [[1], [2, 3]] }],
    ['aralık dışı enlem', { type: 'LineString', coordinates: [[0, 91], [1, 1]] }],
    ['hex olmayan metin', 'LINESTRING(0 0, 1 1)'],
    ['çift olmayan uzunlukta hex', LE + '0'],
    ['kesik hex', LE.slice(0, -2)],
    ['fazladan bayt', LE + '00'],
    ['Point tipi', '0101000000' + '0000000000000000'.repeat(2)],
    ['Z boyutlu EWKB', '01020000A0' + '02000000' + '00'.repeat(48)],
    ['farklı SRID', '0102000020' + '31000000' + '00000000'],
    ['geçersiz bayt sırası', '0202000000' + '00000000'],
  ])('tanınmayan biçim (%s) ServiceError(invalid) fırlatır, sessiz [] yok', (_name, value) => {
    expect(() => parseLineString(value)).toThrow(expect.objectContaining({ name: 'ServiceError', code: 'invalid' }));
  });
});

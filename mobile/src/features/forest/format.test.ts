import { formatCount, formatPlantedDate } from './format';

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
/** Beklenen: aynı anın cihaz yerel günü (saat dilimi ne olursa olsun). */
function localDay(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

describe('formatPlantedDate', () => {
  it('ofsetli ve UTC damgayı cihazın yerel gününe çevirir', () => {
    // Türkiye'de (UTC+3) ikisi de "12 Ekim 2026"; başka saat diliminde yerel güne göre değişir.
    for (const iso of ['2026-10-12T07:30:00+03:00', '2026-10-11T22:30:00Z', '2026-01-05T23:50:00-05:00']) {
      expect(formatPlantedDate(iso)).toBe(localDay(iso));
    }
  });

  it('saatsiz tarihi saat dilimine bakmadan olduğu gibi okur', () => {
    expect(formatPlantedDate('2026-10-12')).toBe('12 Ekim 2026');
  });

  it('geçersiz girdide boş metin verir', () => {
    expect(formatPlantedDate('bozuk')).toBe('');
    expect(formatPlantedDate('')).toBe('');
    expect(formatPlantedDate('2026-13-40')).toBe('');
  });

  it('takvimde olmayan günü olduğu gibi yazmaz, boş döner', () => {
    expect(formatPlantedDate('2026-02-45')).toBe('');
    expect(formatPlantedDate('2026-02-29')).toBe('');
    expect(formatPlantedDate('2026-04-31')).toBe('');
    expect(formatPlantedDate('2026-10-00')).toBe('');
    expect(formatPlantedDate('2028-02-29')).toBe('29 Şubat 2028');
    expect(formatPlantedDate('2026-02-28')).toBe('28 Şubat 2026');
  });
});

describe('formatCount', () => {
  it('Türkçe binlik ayracı koyar', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(154)).toBe('154');
    expect(formatCount(1234)).toBe('1.234');
    expect(formatCount(1234567)).toBe('1.234.567');
  });
});

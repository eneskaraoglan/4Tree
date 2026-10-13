import { formatNumber, formatSince } from './format';

describe('formatNumber', () => {
  it('ondalık virgül ve binlik nokta kullanır', () => {
    expect(formatNumber(147.6)).toBe('147,6');
    expect(formatNumber(1234.5)).toBe('1.234,5');
    expect(formatNumber(1234567, 0)).toBe('1.234.567');
  });

  it('tam sayıda ve sıfırda kesir göstermez, taşan kesri yuvarlar', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(12.04)).toBe('12');
    expect(formatNumber(7, 0)).toBe('7');
    expect(formatNumber(12.36)).toBe('12,4');
  });

  it('geçersiz değerde 0 döner', () => {
    expect(formatNumber(Number.NaN)).toBe('0');
  });
});

describe('formatSince', () => {
  it('ay adını ve yılın okunuşuna uygun çıkma hâli ekini yazar', () => {
    expect(formatSince('2025-12-14T10:00:00+03:00')).toBe("Aralık 2025'ten beri");
    expect(formatSince('2026-08-23T07:30:00+03:00')).toBe("Ağustos 2026'dan beri");
    expect(formatSince('2027-01-02')).toBe("Ocak 2027'den beri");
  });

  it('yılın okunuşuna göre ek alır: 2021, 2025, 2026, 2030, 2040', () => {
    expect(formatSince('2021-05-01')).toBe("Mayıs 2021'den beri"); // bir
    expect(formatSince('2025-05-01')).toBe("Mayıs 2025'ten beri"); // beş
    expect(formatSince('2026-05-01')).toBe("Mayıs 2026'dan beri"); // altı
    expect(formatSince('2030-05-01')).toBe("Mayıs 2030'dan beri"); // otuz
    expect(formatSince('2040-05-01')).toBe("Mayıs 2040'tan beri"); // kırk
  });

  it('her son rakam için doğru eki seçer', () => {
    const suffixes = ['den', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
    suffixes.slice(1).forEach((suffix, i) => {
      expect(formatSince(`202${i + 1}-01-01`)).toBe(`Ocak 202${i + 1}'${suffix} beri`);
    });
  });

  it('0 ile biten yıllarda onlar basamağına bakar', () => {
    expect(formatSince('2020-03-01')).toBe("Mart 2020'den beri");
    expect(formatSince('2030-03-01')).toBe("Mart 2030'dan beri");
    expect(formatSince('2040-03-01')).toBe("Mart 2040'tan beri");
    expect(formatSince('2000-03-01')).toBe("Mart 2000'den beri");
  });

  it('ayrıştırılamayan metinde null döner', () => {
    expect(formatSince('dün')).toBeNull();
    expect(formatSince('2026-13-01')).toBeNull();
  });

  it('UTC/ofsetli zamanı cihazın yerel ayına çevirir (TZ=Europe/Istanbul): 28 Şubat 22:00Z -> Mart', () => {
    expect(new Date('2026-02-28T22:00:00Z').getMonth()).toBe(2); // jest TZ ayarı doğrulaması
    expect(formatSince('2026-02-28T22:00:00Z')).toBe("Mart 2026'dan beri");
    expect(formatSince('2026-02-28T20:59:59Z')).toBe("Şubat 2026'dan beri");
    expect(formatSince('2025-12-31T21:30:00.000000+00:00')).toBe("Ocak 2026'dan beri");
    expect(formatSince('2026-03-01T01:00:00+03:00')).toBe("Mart 2026'dan beri");
  });

  it('yalnız tarih içeren metin saat dilimiyle kaymaz', () => {
    expect(formatSince('2026-03-01')).toBe("Mart 2026'dan beri");
  });
});

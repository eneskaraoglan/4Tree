import { formatDuration, formatKm, formatPostTime } from './format';

const NOW = new Date(2026, 9, 10, 14, 0, 0);
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

describe('formatPostTime', () => {
  it('bir dakikadan yeni olanı "az önce" yazar (gelecek zaman dahil)', () => {
    expect(formatPostTime(ago(20_000), NOW)).toBe('az önce');
    expect(formatPostTime(ago(-5 * MIN), NOW)).toBe('az önce');
  });

  it('dakika ve saati yazar', () => {
    expect(formatPostTime(ago(12 * MIN), NOW)).toBe('12 dk önce');
    expect(formatPostTime(ago(2 * HOUR), NOW)).toBe('2 saat önce');
    expect(formatPostTime(ago(2 * HOUR + 50 * MIN), NOW)).toBe('2 saat önce');
  });

  it('24 saatten kısa farkta gece yarısı geçse de saat/dakika yazar', () => {
    const night = new Date(2026, 9, 10, 0, 30);
    expect(formatPostTime(new Date(2026, 9, 9, 23, 50).toISOString(), night)).toBe('40 dk önce');
    expect(formatPostTime(new Date(2026, 9, 9, 22, 0).toISOString(), night)).toBe('2 saat önce');
    const early = new Date(2026, 9, 10, 1, 0);
    expect(formatPostTime(new Date(2026, 9, 9, 2, 0).toISOString(), early)).toBe('23 saat önce');
    // Dün 14:00 öğleden sonra, şimdi 13:59: 23 sa 59 dk, hâlâ "saat".
    expect(formatPostTime(new Date(2026, 9, 9, 14, 0).toISOString(), new Date(2026, 9, 10, 13, 59))).toBe('23 saat önce');
  });

  it('24 saatten sonra takvim gününe göre "dün" yazar', () => {
    expect(formatPostTime(new Date(2026, 9, 9, 13, 0).toISOString(), new Date(2026, 9, 10, 13, 0))).toBe('dün');
    expect(formatPostTime(new Date(2026, 9, 9, 0, 30).toISOString(), new Date(2026, 9, 10, 1, 0))).toBe('dün');
    expect(formatPostTime(new Date(2026, 9, 8, 23, 0).toISOString(), new Date(2026, 9, 10, 8, 0))).toBe('2 gün önce');
  });

  it('gün, hafta ve ay yazar', () => {
    expect(formatPostTime(ago(3 * DAY), NOW)).toBe('3 gün önce');
    expect(formatPostTime(ago(6 * DAY), NOW)).toBe('6 gün önce');
    expect(formatPostTime(ago(7 * DAY), NOW)).toBe('1 hafta önce');
    expect(formatPostTime(ago(15 * DAY), NOW)).toBe('2 hafta önce');
    expect(formatPostTime(ago(30 * DAY), NOW)).toBe('1 ay önce');
    expect(formatPostTime(ago(95 * DAY), NOW)).toBe('3 ay önce');
  });

  it('geçersiz tarihte boş metin döner', () => {
    expect(formatPostTime('bozuk', NOW)).toBe('');
  });
});

describe('formatKm', () => {
  it('tek ondalık ve virgül kullanır', () => {
    expect(formatKm(5.2)).toBe('5,2');
    expect(formatKm(10)).toBe('10,0');
    expect(formatKm(-1)).toBe('0,0');
    expect(formatKm(Number.NaN)).toBe('0,0');
  });
});

describe('formatDuration', () => {
  it('dakika ve saat+dakika yazar', () => {
    expect(formatDuration(1724)).toBe('29 dk');
    expect(formatDuration(4320)).toBe('1 sa 12 dk');
    expect(formatDuration(-5)).toBe('0 dk');
  });
});

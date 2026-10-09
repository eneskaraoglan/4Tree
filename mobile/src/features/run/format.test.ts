import { formatDuration, formatKm, formatRelativeDay, getSalutation, getTreeProgress, pickCounterVariant } from './format';

describe('formatKm', () => {
  it('Türkçe virgül ve tek ondalık kullanır', () => {
    expect(formatKm(7.6)).toBe('7,6');
    expect(formatKm(12.4)).toBe('12,4');
    expect(formatKm(5)).toBe('5,0');
    expect(formatKm(0)).toBe('0,0');
    expect(formatKm(7.6000000000000005)).toBe('7,6');
  });

  it('geçersiz değerde 0 gösterir', () => {
    expect(formatKm(Number.NaN)).toBe('0,0');
    expect(formatKm(-3)).toBe('0,0');
  });
});

describe('formatDuration', () => {
  it('dakika ve saat+dakika biçimler', () => {
    expect(formatDuration(1860)).toBe('31 dk');
    expect(formatDuration(2139)).toBe('36 dk');
    expect(formatDuration(3600)).toBe('1 sa 0 dk');
    expect(formatDuration(7320)).toBe('2 sa 2 dk');
    expect(formatDuration(-1)).toBe('0 dk');
  });
});

describe('getSalutation', () => {
  it('saate göre selam seçer', () => {
    expect(getSalutation(new Date(2026, 9, 10, 5, 0))).toBe('Günaydın');
    expect(getSalutation(new Date(2026, 9, 10, 11, 59))).toBe('Günaydın');
    expect(getSalutation(new Date(2026, 9, 10, 12, 0))).toBe('İyi günler');
    expect(getSalutation(new Date(2026, 9, 10, 17, 59))).toBe('İyi günler');
    expect(getSalutation(new Date(2026, 9, 10, 18, 0))).toBe('İyi akşamlar');
    expect(getSalutation(new Date(2026, 9, 10, 2, 0))).toBe('İyi akşamlar');
  });
});

describe('formatRelativeDay', () => {
  const now = new Date(2026, 9, 10, 12, 0);
  const at = (day: number, month = 9) => new Date(2026, month, day, 23, 30).toISOString();

  it('takvim gününe göre göreli tarih verir', () => {
    expect(formatRelativeDay(at(10), now)).toBe('bugün');
    expect(formatRelativeDay(at(9), now)).toBe('dün');
    expect(formatRelativeDay(at(7), now)).toBe('3 gün önce');
    expect(formatRelativeDay(at(3), now)).toBe('1 hafta önce');
    expect(formatRelativeDay(at(20, 8), now)).toBe('2 hafta önce');
    expect(formatRelativeDay(at(1, 6), now)).toBe('3 ay önce');
  });

  it('"dün" takvim gününe bakar, 24 saate değil', () => {
    const justAfterMidnight = new Date(2026, 9, 10, 0, 5);
    const lateYesterday = new Date(2026, 9, 9, 23, 55).toISOString();
    expect(formatRelativeDay(lateYesterday, justAfterMidnight)).toBe('dün');

    const earlyToday = new Date(2026, 9, 10, 0, 5).toISOString();
    const lateToday = new Date(2026, 9, 10, 23, 55);
    expect(formatRelativeDay(earlyToday, lateToday)).toBe('bugün');
  });

  it('geçersiz tarihte boş döner, gelecekteki tarihte "bugün"', () => {
    expect(formatRelativeDay('bozuk', now)).toBe('');
    expect(formatRelativeDay(at(12), now)).toBe('bugün');
  });
});

describe('getTreeProgress', () => {
  it('dilimdeki km, kalan km ve ilerlemeyi tutarlı verir', () => {
    expect(getTreeProgress(147.6)).toEqual({ progress: 0.38, doneKm: 7.6, remainingKm: 12.4 });
    expect(getTreeProgress(0)).toEqual({ progress: 0, doneKm: 0, remainingKm: 20 });
    expect(getTreeProgress(40)).toEqual({ progress: 0, doneKm: 0, remainingKm: 20 });
    expect(getTreeProgress(Number.NaN).remainingKm).toBe(20);
  });

  it('ağaç bitmeden kalan 0,0 olmaz: 19,96 / 19,95 / 19,99 için kalan 0,1, yapılan 19,9', () => {
    for (const total of [19.94, 19.95, 19.96, 19.99, 39.97]) {
      const { doneKm, remainingKm, progress } = getTreeProgress(total);
      expect(remainingKm).toBe(0.1);
      expect(doneKm).toBe(19.9);
      expect(progress).toBeLessThan(1);
    }
  });

  it('tam 20 km yeni ağaca geçer; hemen öncesi ve sonrası tutarlıdır', () => {
    const before = getTreeProgress(19.9);
    expect(before).toMatchObject({ doneKm: 19.9, remainingKm: 0.1 });
    expect(before.progress).toBeCloseTo(0.995, 6);
    expect(getTreeProgress(20)).toEqual({ progress: 0, doneKm: 0, remainingKm: 20 });
    expect(getTreeProgress(20.04)).toMatchObject({ doneKm: 0, remainingKm: 20 });
    expect(getTreeProgress(20.5)).toMatchObject({ doneKm: 0.5, remainingKm: 19.5 });
  });
});

describe('pickCounterVariant', () => {
  it('geniş boşlukta timer, dar boşlukta ya da büyük yazı ölçeğinde bigNumber seçer', () => {
    expect(pickCounterVariant(190, 1)).toBe('timer');
    expect(pickCounterVariant(150, 1)).toBe('bigNumber');
    expect(pickCounterVariant(190, 1.2)).toBe('bigNumber');
    expect(pickCounterVariant(230, 1.2)).toBe('timer');
    // Ölçek üst sınırı 1,2'dir: 3 olsa da 1,2 gibi davranır.
    expect(pickCounterVariant(230, 3)).toBe('timer');
  });
});

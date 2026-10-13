import { formatClock, formatDistance } from './format';

describe('formatClock', () => {
  it('dakika:saniye biçimler', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(332)).toBe('05:32');
    expect(formatClock(3599)).toBe('59:59');
  });

  it('saati geçince saat:dakika:saniye', () => {
    expect(formatClock(3600)).toBe('1:00:00');
    expect(formatClock(3932)).toBe('1:05:32');
  });

  it('geçersiz değerde 00:00', () => {
    expect(formatClock(-5)).toBe('00:00');
    expect(formatClock(Number.NaN)).toBe('00:00');
  });
});

describe('formatDistance', () => {
  it('Türkçe virgül ve iki ondalık', () => {
    expect(formatDistance(3.4167)).toBe('3,42');
    expect(formatDistance(0)).toBe('0,00');
    expect(formatDistance(12.005)).toBe('12,01');
    expect(formatDistance(-1)).toBe('0,00');
  });
});

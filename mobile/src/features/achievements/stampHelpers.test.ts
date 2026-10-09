import { createMockServices } from '@/services';
import { colors } from '@/theme';

import { orderBadges, countEarned } from './badges';
import { formatLongDate, formatStampDate, parseIsoDate } from './formatBadgeDate';
import { LEVEL_ORDER, treesToNextLevel } from './levelCopy';
import { perforatedPath, stampMetrics, stampTilt } from './stampGeometry';
import { STAMP_MOTIF_IDS } from './stampMotifs';
import { LOCKED_TONE, STAMP_TONES, toneKeyFor } from './stampTones';

function luminance(hex: string): number {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('stampTilt', () => {
  it('aynı id için aynı, ±1-3 derece aralığında eğim verir', async () => {
    const badges = await createMockServices().badge.getBadges();
    const tilts = badges.map((b) => stampTilt(b.id));

    expect(tilts).toEqual(badges.map((b) => stampTilt(b.id)));
    tilts.forEach((t) => {
      expect(Math.abs(t)).toBeGreaterThanOrEqual(1);
      expect(Math.abs(t)).toBeLessThanOrEqual(3);
    });
    expect(new Set(tilts).size).toBeGreaterThan(3);
  });
});

describe('perforatedPath', () => {
  it('kapalı yol üretir, tırtık sayısı kadar yay içerir ve köşelerden başlar', () => {
    const m = stampMetrics(150);
    const d = perforatedPath(m.width, m.height, m.notchR, m.pitch);

    expect(d.startsWith('M0 0')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    const arcs = d.match(/A/g)?.length ?? 0;
    expect(arcs).toBeGreaterThanOrEqual(2 * (Math.round(m.width / m.pitch) + Math.round(m.height / m.pitch)));
    expect(d).not.toMatch(/NaN|Infinity/);
  });
});

describe('stampMetrics', () => {
  it('baskı alanı ve rozet adı kağıt içinde, damga pulun içinde kalır', () => {
    [120, 148, 170, 240].forEach((w) => {
      const m = stampMetrics(w);
      expect(m.fieldW).toBeLessThan(w);
      expect(m.nameTop).toBeLessThan(m.height);
      expect(m.pitch).toBeGreaterThan(2 * m.notchR);
      expect(m.postmark).toBeLessThan(w / 2);
      // Ad (en çok 2 satır) ve ipucu pulun içine sığar, kazanılmış ad damgaya çarpmaz.
      expect(m.nameTop + 42 + m.hintLines * 16).toBeLessThanOrEqual(m.height - m.pad / 2);
      expect(m.earnedNameWidth).toBeGreaterThanOrEqual(70);
      expect(m.pad + m.earnedNameWidth).toBeLessThan(m.postmarkLeft);
      // Baskı alanı pulun yarısından fazlasını kaplar; alt şerit boş kağıt gibi kalmaz.
      expect(m.fieldH / m.height).toBeGreaterThan(0.5);
    });
  });
});

describe('stampTones', () => {
  it('mürekkep ve kilitli metin renkleri kağıt üstünde AA (4.5:1)', () => {
    Object.values(STAMP_TONES).forEach((tone) => {
      expect(contrast(tone.ink, tone.paper)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(tone.motif, tone.field)).toBeGreaterThanOrEqual(4.5);
    });
    expect(contrast(colors.textSecondary, LOCKED_TONE.paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.textTertiary, LOCKED_TONE.field)).toBeGreaterThanOrEqual(4.5);
  });

  it('mock rozetlerin hepsinin motifi ve tonu vardır; birden çok ton kullanılır', async () => {
    const badges = await createMockServices().badge.getBadges();

    badges.forEach((b) => expect(STAMP_MOTIF_IDS).toContain(b.id));
    expect(new Set(badges.map((b) => toneKeyFor(b.id))).size).toBeGreaterThanOrEqual(3);
    expect(toneKeyFor('bilinmeyen')).toBe(toneKeyFor('bilinmeyen'));
  });
});

describe('formatBadgeDate', () => {
  const TR = 'Europe/Istanbul';

  it('Z ve ofsetli zaman damgasını verilen saat diliminin gününe çevirir', () => {
    // 22:00 UTC = Türkiye'de ertesi gün 01:00.
    expect(formatLongDate('2026-10-07T22:00:00Z', TR)).toBe('8 Ekim 2026');
    expect(formatLongDate('2026-10-07T22:00:00Z', 'UTC')).toBe('7 Ekim 2026');
    expect(formatStampDate('2026-08-23T09:04:00+03:00', TR)).toEqual({ dayMonth: '23 Ağu', year: '2026' });
    expect(parseIsoDate('2026-12-31T23:30:00Z', TR)).toEqual({ day: 1, month: 1, year: 2027 });
  });

  it('saat dilimi verilmezse cihazın yerel gününü kullanır', () => {
    const d = new Date('2026-10-07T22:00:00Z');
    expect(parseIsoDate('2026-10-07T22:00:00Z')).toEqual({ day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() });
  });

  it('saatsiz tarihi kaydırmadan okur; geçersiz ya da eksik tarih null verir', () => {
    expect(parseIsoDate('2026-10-07', 'America/Los_Angeles')).toEqual({ day: 7, month: 10, year: 2026 });
    expect(formatLongDate(undefined)).toBeNull();
    expect(formatStampDate('bozuk')).toBeNull();
    expect(parseIsoDate('2026-13-40')).toBeNull();
  });
});

describe('treesToNextLevel', () => {
  it('eşiklere göre kalan ağacı yukarı yuvarlar', () => {
    // Fidan (3) > Ağaç (10): 7,38 ağaç ile 2,62 ağaç kalır, 3 gösterilir.
    expect(treesToNextLevel({ level: 'sapling', nextLevel: 'tree', progress: (7.38 - 3) / 7 })).toBe(3);
    expect(treesToNextLevel({ level: 'seed', nextLevel: 'sapling', progress: 0 })).toBe(3);
    expect(treesToNextLevel({ level: 'tree', nextLevel: 'forest', progress: 0.9999999 })).toBe(1);
    expect(treesToNextLevel({ level: 'forest', nextLevel: null, progress: 1 })).toBeNull();
  });

  it('seviye sırası Tohum, Fidan, Ağaç, Orman', () => {
    expect(LEVEL_ORDER).toEqual(['seed', 'sapling', 'tree', 'forest']);
  });
});

describe('orderBadges', () => {
  it('kazanılanlar tarih sırasıyla önce, kilitliler sonra gelir', async () => {
    const badges = await createMockServices().badge.getBadges();
    const ordered = orderBadges([...badges].reverse());
    const earnedCount = countEarned(badges);

    expect(ordered.slice(0, earnedCount).every((b) => b.earned)).toBe(true);
    expect(ordered.slice(earnedCount).every((b) => !b.earned)).toBe(true);
    const dates = ordered.slice(0, earnedCount).map((b) => b.earnedAt ?? '');
    expect(dates).toEqual([...dates].sort());
  });
});

import { achievements } from '@/i18n';

type DateParts = { day: number; month: number; year: number };

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * ISO zaman damgasını kullanıcının yerel gününe çevirir (ofsetli ya da Z'li olabilir).
 * `timeZone` verilmezse cihazın saat dilimi kullanılır; testlerde ve belirli bir bölge için IANA adı geçilebilir.
 * Saatsiz "2026-10-07" tarihi gün olarak olduğu gibi okunur (saat dilimi kayması olmasın).
 */
export function parseIsoDate(iso: string | undefined, timeZone?: string): DateParts | null {
  if (!iso) return null;
  const dateOnly = DATE_ONLY.exec(iso);
  if (dateOnly) {
    const [year, month, day] = [Number(dateOnly[1]), Number(dateOnly[2]), Number(dateOnly[3])];
    return month >= 1 && month <= 12 && day >= 1 && day <= 31 ? { day, month, year } : null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  if (!timeZone) return { day: date.getDate(), month: date.getMonth() + 1, year: date.getFullYear() };
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(date);
  const pick = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { day: pick('day'), month: pick('month'), year: pick('year') };
}

/** Damga için iki satır: "12 Eki" ve "2026". */
export function formatStampDate(iso: string | undefined, timeZone?: string): { dayMonth: string; year: string } | null {
  const parts = parseIsoDate(iso, timeZone);
  if (!parts) return null;
  return { dayMonth: `${parts.day} ${achievements.months.short[parts.month - 1]}`, year: String(parts.year) };
}

/** Ekran okuyucu ve sheet için tam tarih: "7 Ekim 2026". */
export function formatLongDate(iso: string | undefined, timeZone?: string): string | null {
  const parts = parseIsoDate(iso, timeZone);
  if (!parts) return null;
  return `${parts.day} ${achievements.months.long[parts.month - 1]} ${parts.year}`;
}

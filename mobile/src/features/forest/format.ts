import { forestTr } from '@/i18n';

/**
 * "12 Ekim 2026". Zaman damgası ofsetli ya da 'Z' ISO beklenir; cihazın yerel gününe çevrilir.
 * Saat içermeyen "2026-10-12" olduğu gibi okunur (saat dilimi günü kaydırmaz). Okunamazsa ''.
 */
export function formatPlantedDate(iso: string): string {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (dateOnly) {
    const [year, monthNo, day] = [Number(dateOnly[1]), Number(dateOnly[2]), Number(dateOnly[3])];
    const month = forestTr.months[monthNo - 1];
    // 2026-02-45 gibi takvimde olmayan günler olduğu gibi yazılmaz.
    const daysInMonth = new Date(Date.UTC(year, monthNo, 0)).getUTCDate();
    return month && day >= 1 && day <= daysInMonth ? `${day} ${month} ${dateOnly[1]}` : '';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getDate()} ${forestTr.months[date.getMonth()]} ${date.getFullYear()}`;
}

/** Türkçe binlik ayracı: 1234 -> "1.234". */
export function formatCount(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

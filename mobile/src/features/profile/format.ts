import { fill, profileTr } from '@/i18n';

/** tr-TR sayı biçimi: ondalık virgül, binlik nokta. 147.6 -> "147,6", 0 -> "0". */
export function formatNumber(value: number, maxFractionDigits = 1): string {
  if (!Number.isFinite(value)) return '0';
  const factor = 10 ** maxFractionDigits;
  const rounded = Math.round(value * factor) / factor;
  const [intPart, fractionPart] = String(Math.abs(rounded)).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = rounded < 0 ? '-' : '';
  return fractionPart ? `${sign}${grouped},${fractionPart}` : `${sign}${grouped}`;
}

/** Sayının okunuşunun son hecesine göre "-dan/-den/-tan/-ten" (çıkma hâli) eki. */
const ABLATIVE_BY_DIGIT = ['den', 'den', 'den', 'ten', 'ten', 'ten', 'dan', 'den', 'den', 'dan'];
/** Onlar basamağı (yalnız son rakam 0 iken): on, yirmi, otuz, kırk, elli, altmış, yetmiş, seksen, doksan. */
const ABLATIVE_BY_TENS = ['den', 'dan', 'den', 'dan', 'tan', 'den', 'tan', 'ten', 'den', 'dan'];

function ablativeSuffix(year: number): string {
  const lastDigit = year % 10;
  if (lastDigit !== 0) return ABLATIVE_BY_DIGIT[lastDigit];
  const tensDigit = Math.floor(year / 10) % 10;
  // 2000, 2100: "bin", "yüz" için de "-den".
  return ABLATIVE_BY_TENS[tensDigit];
}

/**
 * "2025-12-14T..." -> "Aralık 2025'ten beri". Ayrıştırılamazsa null.
 * Saat bilgili (UTC "Z" ya da ofsetli) zaman cihazın yerel gününe çevrilir: 28 Şubat 22:00Z, TR'de 1 Mart'tır.
 * Yalnız tarih içeren metin ("2027-01-02") saat dilimsizdir; metinden okunur, kayma olmaz.
 */
export function formatSince(iso: string): string | null {
  let year: number;
  let monthIndex: number;
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(iso)) {
    year = Number(iso.slice(0, 4));
    monthIndex = Number(iso.slice(5, 7)) - 1;
  } else {
    if (!/^\d{4}-\d{2}/.test(iso)) return null;
    const time = Date.parse(iso);
    if (Number.isNaN(time)) return null;
    const local = new Date(time);
    year = local.getFullYear();
    monthIndex = local.getMonth();
  }
  const month = profileTr.months[monthIndex];
  if (!month) return null;
  return fill(profileTr.since, { date: `${month} ${year}'${ablativeSuffix(year)}` });
}

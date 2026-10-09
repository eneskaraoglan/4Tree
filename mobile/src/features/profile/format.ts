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

/** "2025-12-14T..." -> "Aralık 2025'ten beri". Ayrıştırılamazsa null. Saat dilimi kaymasın diye metinden okunur. */
export function formatSince(iso: string): string | null {
  const match = /^(\d{4})-(\d{2})/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = profileTr.months[Number(match[2]) - 1];
  if (!month) return null;
  return fill(profileTr.since, { date: `${month} ${year}'${ablativeSuffix(year)}` });
}

/** En eski aktivitenin tarihi ("... beri" satırı için); aktivite yoksa null. */
export function earliestStartedAt(startedAts: readonly string[]): string | null {
  if (startedAts.length === 0) return null;
  // ISO metni sıralaması saat dilimi farkı yüzünden kayabilir; gün başına bakmak yeterli.
  return [...startedAts].sort((a, b) => a.slice(0, 10).localeCompare(b.slice(0, 10)))[0];
}

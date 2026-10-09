import { KM_PER_TREE, kmToNextTree } from '@/services';
import { trRun } from '@/i18n';

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Türkçe biçim: tek ondalık, virgül ayraç. 7.6 -> "7,6". */
export function formatKm(km: number): string {
  const safe = Number.isFinite(km) && km > 0 ? km : 0;
  return round1(safe).toFixed(1).replace('.', ',');
}

/** 2139 sn -> "36 dk"; 4320 sn -> "1 sa 12 dk". */
export function formatDuration(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const totalMinutes = Math.round(safe / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? trRun.duration.hoursMinutes(hours, minutes) : trRun.duration.minutes(minutes);
}

/** Saate göre selam: 05-11 günaydın, 12-17 iyi günler, geri kalanı iyi akşamlar. */
export function getSalutation(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return trRun.greeting.morning;
  if (hour >= 12 && hour < 18) return trRun.greeting.day;
  return trRun.greeting.evening;
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** Takvim gününe göre göreli tarih: "bugün", "dün", "3 gün önce", "2 hafta önce", "3 ay önce". */
export function formatRelativeDay(iso: string, now: Date): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const days = Math.round((startOfDay(now).getTime() - startOfDay(then).getTime()) / 86_400_000);
  if (days <= 0) return trRun.relative.today;
  if (days === 1) return trRun.relative.yesterday;
  if (days < 7) return trRun.relative.daysAgo(days);
  if (days < 30) return trRun.relative.weeksAgo(Math.floor(days / 7));
  return trRun.relative.monthsAgo(Math.max(1, Math.floor(days / 30)));
}

export type TreeProgress = {
  /** 0-1, halka dolulığı. */
  progress: number;
  /** Bu ağaç için yapılan km (gösterim için yuvarlanmış). */
  doneKm: number;
  /** Ağaca kalan km (gösterim için yuvarlanmış); doneKm + remainingKm = 20. */
  remainingKm: number;
};

/** Ağaç tamamlanmadan gösterilen en küçük kalan mesafe: "0,0 km kaldı" asla çıkmaz. */
const MIN_REMAINING_KM = 0.1;

/**
 * Toplam km'den mevcut 20 km'lik dilimin durumunu çıkarır; yuvarlama iki sayıyı tutarlı tutar.
 * Ağaç bitmediği sürece (örn. 19,96 km) kalan en az 0,1 gösterilir; tam 20'ye ulaşınca yeni dilim başlar.
 */
export function getTreeProgress(totalKm: number): TreeProgress {
  const safeTotal = Number.isFinite(totalKm) && totalKm > 0 ? totalKm : 0;
  const rawRemaining = kmToNextTree(safeTotal);
  const remainingKm = rawRemaining >= KM_PER_TREE ? KM_PER_TREE : Math.max(MIN_REMAINING_KM, round1(rawRemaining));
  const doneKm = round1(KM_PER_TREE - remainingKm);
  return { progress: doneKm / KM_PER_TREE, doneKm, remainingKm };
}

/** Merkez sayının tahmini genişliği (yazı boyutu katı): 3 rakam kutusu + ondalık virgül. */
const COUNTER_WIDTH_EM = 3 * 0.6 + 0.35;
/** Sayı + "/ 20 km" satırı için yükseklik (dp, ölçeksiz): timer satırı 80 + ikincil metin 20. */
const COUNTER_STACK_HEIGHT = 100;
const TIMER_FONT_SIZE = 76;

/**
 * Halka merkezine sığan en büyük sayaç boyutu. `fontScale` sistem yazı ölçeğidir (üst sınır 1,2 uygulanır).
 */
export function pickCounterVariant(hole: number, fontScale: number): 'timer' | 'bigNumber' {
  const scale = Math.min(Math.max(fontScale, 1), 1.2);
  const fitsWidth = TIMER_FONT_SIZE * scale * COUNTER_WIDTH_EM <= hole;
  const fitsHeight = COUNTER_STACK_HEIGHT * scale <= hole;
  return fitsWidth && fitsHeight ? 'timer' : 'bigNumber';
}

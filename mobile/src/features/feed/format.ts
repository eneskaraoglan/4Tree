import { trFeed } from '@/i18n';

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** Türkçe biçim: tek ondalık, virgül ayraç. 5.2 -> "5,2". */
export function formatKm(km: number): string {
  const safe = Number.isFinite(km) && km > 0 ? km : 0;
  return (Math.round(safe * 10) / 10).toFixed(1).replace('.', ',');
}

/** 1724 sn -> "29 dk"; 4320 sn -> "1 sa 12 dk". */
export function formatDuration(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const totalMinutes = Math.round(safe / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? trFeed.duration.hoursMinutes(hours, minutes) : trFeed.duration.minutes(minutes);
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * Gönderi zamanı: "az önce", "12 dk önce", "2 saat önce" (24 saatten kısa fark, gece yarısı geçse de),
 * sonra takvim gününe göre "dün", "3 gün önce", "2 hafta önce", "3 ay önce".
 */
export function formatPostTime(iso: string, now: Date): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const diff = now.getTime() - then.getTime();
  if (diff < MINUTE_MS) return trFeed.time.justNow;
  if (diff < HOUR_MS) return trFeed.time.minutesAgo(Math.floor(diff / MINUTE_MS));
  if (diff < DAY_MS) return trFeed.time.hoursAgo(Math.floor(diff / HOUR_MS));

  const days = Math.round((startOfDay(now).getTime() - startOfDay(then).getTime()) / DAY_MS);
  if (days <= 1) return trFeed.time.yesterday;
  if (days < 7) return trFeed.time.daysAgo(days);
  if (days < 30) return trFeed.time.weeksAgo(Math.floor(days / 7));
  return trFeed.time.monthsAgo(Math.max(1, Math.floor(days / 30)));
}

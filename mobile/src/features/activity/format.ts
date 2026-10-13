/** Süre sayacı: "05:32", bir saati geçince "1:05:32". */
export function formatClock(totalSec: number): string {
  const safe = Number.isFinite(totalSec) && totalSec > 0 ? Math.floor(totalSec) : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Mesafe, Türkçe virgül ve iki ondalık: 3.4167 -> "3,42". */
export function formatDistance(km: number): string {
  const safe = Number.isFinite(km) && km > 0 ? km : 0;
  return (Math.round(safe * 100) / 100).toFixed(2).replace('.', ',');
}

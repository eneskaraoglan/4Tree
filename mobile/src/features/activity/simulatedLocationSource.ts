import {
  LocationPermissionError,
  type LocationHandlers,
  type LocationPermission,
  type LocationSource,
  type LocationTracking,
} from './LocationSource';

export type SimulatedSourceOptions = {
  /** İlk izin durumu. Varsayılan 'undetermined'; requestPermission verir. */
  permission?: LocationPermission;
  /** Hız (m/sn). Varsayılan 2,8 (yaklaşık 10 km/s koşu). */
  speedMs?: number;
  /** Ölçüm aralığı (ms). Varsayılan 1000. */
  intervalMs?: number;
  /** Başlangıç noktası. Varsayılan: Belgrad Ormanı yakını. */
  origin?: { lat: number; lng: number };
  /** Zaman kaynağı (testte sabitlenir). */
  now?: () => number;
};

const METERS_PER_DEG_LAT = 111_320;

/**
 * Web önizleme ve geliştirme için sahte konum akışı: yumuşak bir dalga çizerek ilerler.
 * Gerçek GPS yoktur; web'de yalnız arayüzü görmek içindir.
 */
export function createSimulatedLocationSource(options: SimulatedSourceOptions = {}): LocationSource {
  const {
    speedMs = 2.8,
    intervalMs = 1000,
    origin = { lat: 41.1744, lng: 28.9877 },
    now = Date.now,
  } = options;
  let permission: LocationPermission = options.permission ?? 'undetermined';

  return {
    async getPermission() {
      return permission;
    },
    async requestPermission() {
      if (permission === 'undetermined' || permission === 'denied') permission = 'granted';
      return permission;
    },
    async stopOrphaned() {},
    async start({ onSample }: LocationHandlers): Promise<LocationTracking> {
      if (permission !== 'granted') throw new LocationPermissionError();
      let step = 0;
      const metersPerDegLng = METERS_PER_DEG_LAT * Math.cos((origin.lat * Math.PI) / 180);
      const timer = setInterval(() => {
        step += 1;
        const meters = step * speedMs * (intervalMs / 1000);
        // Doğuya ilerlerken kuzey-güney yönünde hafif salınım.
        const north = Math.sin(meters / 180) * 60;
        onSample({
          lat: origin.lat + north / METERS_PER_DEG_LAT,
          lng: origin.lng + meters / metersPerDegLng,
          timestamp: now(),
          accuracyM: 6,
          speedMs,
        });
      }, intervalMs);
      return {
        background: false,
        async stop() {
          clearInterval(timer);
        },
      };
    },
  };
}

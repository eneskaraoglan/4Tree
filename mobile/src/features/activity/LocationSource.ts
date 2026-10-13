import type { LocationSample } from './types';

/**
 * Konum izni durumu.
 * - undetermined: henüz sorulmadı
 * - denied: reddedildi ama sistem tekrar sorabilir (Android ilk ret)
 * - blocked: reddedildi ve tekrar sorulamaz; yalnız Ayarlar'dan açılır
 */
export type LocationPermission = 'granted' | 'undetermined' | 'denied' | 'blocked';

/** Çalışan bir konum takibi. */
export type LocationTracking = {
  /** Arka plan takibi (Android ön plan servisi / iOS background location) gerçekten başladı mı. */
  background: boolean;
  stop: () => Promise<void>;
};

export type LocationHandlers = {
  onSample: (sample: LocationSample) => void;
  /** Takip sırasında oluşan hata (servis kapandı, sinyal yok vb.). */
  onError: (message: string) => void;
};

/** İzin yokken `start` bunu fırlatır. */
export class LocationPermissionError extends Error {
  constructor() {
    super('Konum izni verilmemiş.');
    this.name = 'LocationPermissionError';
  }
}

/**
 * Konum kaynağı soyutlaması. Ekranlar ve takip mantığı expo-location'ı bilmez;
 * cihazda expoLocationSource, web/testte simulatedLocationSource kullanılır.
 */
export interface LocationSource {
  getPermission(): Promise<LocationPermission>;
  requestPermission(): Promise<LocationPermission>;
  /**
   * İzin yoksa LocationPermissionError fırlatır. Dönen takibin `stop`'u yalnız KENDİ oturumunu kapatır
   * (sonradan başlayan oturum etkilenmez) ve birden çok kez çağrılabilir.
   */
  start(handlers: LocationHandlers): Promise<LocationTracking>;
  /**
   * Uygulama açılışında, canlı aktivite yokken çağrılır: önceki oturumdan kalan arka plan görevini
   * (uygulama öldürüldüyse) durdurur. Hata fırlatmaz.
   */
  stopOrphaned(): Promise<void>;
}

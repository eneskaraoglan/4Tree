/** Seçilebilir gizlilik bölgesi yarıçapları (metre). */
export const ZONE_RADIUS_OPTIONS = [100, 250, 500] as const;
export const DEFAULT_ZONE_RADIUS = 250;

/**
 * MOCK: gerçek konum seçici (harita/GPS) sonraki görevde gelecek; şimdilik sabit koordinat (Belgrad Ormanı yakını).
 * Backend/konum izni bağlanınca bu sabit kalkar.
 */
export const MOCK_ZONE_LOCATION = { lat: 41.1775, lng: 28.979 } as const;

/**
 * Bölge adı için en çok karakter. Not: PrivacyService doğrulaması şimdilik uzunluk denetlemiyor
 * (backend notu); sınır tek kaynak olarak burada, servis ona geçince buradan alınmalı.
 */
export const ZONE_LABEL_MAX_LENGTH = 24;

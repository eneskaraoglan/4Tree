/**
 * Bölge sabitleri ve doğrulama kuralı tek kaynakta: services/privacyZoneRules.ts
 * (servis katmanı features'a bağımlı olmasın diye). Arayüz buradan okur.
 */
export {
  DEFAULT_ZONE_RADIUS,
  MAX_ZONES_PER_USER,
  ZONE_LABEL_MAX_LENGTH,
  ZONE_RADIUS_OPTIONS,
} from '@/services/privacyZoneRules';

/**
 * MOCK: gerçek konum seçici (harita/GPS) sonraki görevde gelecek; şimdilik sabit koordinat (Belgrad Ormanı yakını).
 * Backend/konum izni bağlanınca bu sabit kalkar.
 */
export const MOCK_ZONE_LOCATION = { lat: 41.1775, lng: 28.979 } as const;

import type { PrivacySettings, PrivacyZone, Visibility } from '@/types';

export interface PrivacyService {
  getSettings(): Promise<PrivacySettings>;
  setVisibility(visibility: Visibility): Promise<PrivacySettings>;
  /** Geçersiz giriş (boş etiket, radiusM <= 0, lat/lng aralık dışı) ServiceError('invalid') ile reddedilir. */
  addZone(zone: Omit<PrivacyZone, 'id'>): Promise<PrivacySettings>;
  /** Olmayan bölge için ServiceError('not_found'). */
  removeZone(zoneId: string): Promise<PrivacySettings>;
}

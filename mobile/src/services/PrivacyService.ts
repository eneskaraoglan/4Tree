import type { PrivacySettings, PrivacyZone, Visibility } from '@/types';

export interface PrivacyService {
  getSettings(): Promise<PrivacySettings>;
  setVisibility(visibility: Visibility): Promise<PrivacySettings>;
  /**
   * Geçersiz giriş ServiceError('invalid') ile reddedilir (kurallar: privacyZoneRules.ts): boş/görünmez/kontrol
   * karakterli ya da çok uzun etiket, izinli olmayan yarıçap (100/250/500 m), lat/lng aralık dışı,
   * kullanıcı başına bölge sınırı aşımı.
   */
  addZone(zone: Omit<PrivacyZone, 'id'>): Promise<PrivacySettings>;
  /** Olmayan bölge için ServiceError('not_found'). */
  removeZone(zoneId: string): Promise<PrivacySettings>;
}

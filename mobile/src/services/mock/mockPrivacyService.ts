import type { PrivacySettings, PrivacyZone, Visibility } from '@/types';

import { ServiceError } from '../errors';
import type { PrivacyService } from '../PrivacyService';
import { assertZoneCapacity, validateZone } from '../privacyZoneRules';

const VISIBILITIES: Visibility[] = ['public', 'friends', 'private'];

export function createMockPrivacyService(initial: PrivacySettings): PrivacyService {
  let settings: PrivacySettings = {
    visibility: initial.visibility,
    zones: initial.zones.map((z) => ({ ...z })),
  };
  let nextZoneId = settings.zones.length + 1;

  const snapshot = (): PrivacySettings => ({
    visibility: settings.visibility,
    zones: settings.zones.map((z) => ({ ...z })),
  });

  return {
    getSettings: async () => snapshot(),
    setVisibility: async (visibility) => {
      if (!VISIBILITIES.includes(visibility)) throw new ServiceError('invalid', 'Görünürlük değeri geçersiz.');
      settings = { ...settings, visibility };
      return snapshot();
    },
    addZone: async (zone) => {
      const label = validateZone(zone);
      assertZoneCapacity(settings.zones.length);
      const created: PrivacyZone = { ...zone, label, id: `zone-new-${nextZoneId++}` };
      settings = { ...settings, zones: [...settings.zones, created] };
      return snapshot();
    },
    removeZone: async (zoneId) => {
      if (!settings.zones.some((z) => z.id === zoneId)) {
        throw new ServiceError('not_found', 'Bu gizlilik bölgesi bulunamadı.');
      }
      settings = { ...settings, zones: settings.zones.filter((z) => z.id !== zoneId) };
      return snapshot();
    },
  };
}

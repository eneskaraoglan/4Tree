import type { PrivacySettings, PrivacyZone } from '@/types';

import { ServiceError } from '../errors';
import type { PrivacyService } from '../PrivacyService';

function validateZone(zone: Omit<PrivacyZone, 'id'>): void {
  if (zone.label.trim().length === 0) {
    throw new ServiceError('invalid', 'Bölgeye bir ad ver.');
  }
  if (!Number.isFinite(zone.radiusM) || zone.radiusM <= 0) {
    throw new ServiceError('invalid', 'Yarıçap sıfırdan büyük olmalı.');
  }
  if (!Number.isFinite(zone.lat) || zone.lat < -90 || zone.lat > 90) {
    throw new ServiceError('invalid', 'Enlem -90 ile 90 arasında olmalı.');
  }
  if (!Number.isFinite(zone.lng) || zone.lng < -180 || zone.lng > 180) {
    throw new ServiceError('invalid', 'Boylam -180 ile 180 arasında olmalı.');
  }
}

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
      settings = { ...settings, visibility };
      return snapshot();
    },
    addZone: async (zone) => {
      validateZone(zone);
      const created: PrivacyZone = { ...zone, label: zone.label.trim(), id: `zone-new-${nextZoneId++}` };
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

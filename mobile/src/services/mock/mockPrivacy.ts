import type { PrivacySettings } from '@/types';

export const MOCK_PRIVACY: PrivacySettings = {
  visibility: 'friends',
  zones: [
    { id: 'zone-home', label: 'Ev', lat: 41.1432, lng: 29.0058, radiusM: 300 },
    { id: 'zone-work', label: 'İş', lat: 41.1098, lng: 29.0213, radiusM: 200 },
  ],
};

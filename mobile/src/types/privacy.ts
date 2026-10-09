/** herkese açık | sadece arkadaşlar | gizli */
export type Visibility = 'public' | 'friends' | 'private';

export type PrivacyZone = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  radiusM: number;
};

export type PrivacySettings = {
  visibility: Visibility;
  zones: PrivacyZone[];
};

import type { PrivacySettings, Visibility } from '@/types';

import type { PrivacyService } from '../PrivacyService';
import { assertZoneCapacity, validateZone } from '../privacyZoneRules';
import { guard, requireUserId, serviceError, throwIfError } from './supabaseHelpers';
import { supabase } from './supabaseClient';

const VISIBILITIES: Visibility[] = ['public', 'friends', 'private'];

type ZoneRow = {
  id: string;
  label: string;
  radius_m: number | string;
  /** privacy_zones için hesaplanmış sütunlar (migration: center_lat / center_lng). */
  center_lat: number | string;
  center_lng: number | string;
};

/** PostGIS geography için EWKT; sıra (boylam enlem). */
const toPointWkt = (lat: number, lng: number): string =>
  `SRID=4326;POINT(${lng.toFixed(7)} ${lat.toFixed(7)})`;

async function fetchSettings(userId: string): Promise<PrivacySettings> {
  const [profile, zones] = await Promise.all([
    supabase.from('users_profile').select('visibility').eq('id', userId).maybeSingle(),
    supabase
      .from('privacy_zones')
      .select('id, label, radius_m, center_lat, center_lng')
      .eq('user_id', userId)
      .order('created_at'),
  ]);
  throwIfError(profile.error);
  throwIfError(zones.error);

  const visibility = (profile.data as { visibility?: Visibility } | null)?.visibility;
  if (!visibility || !VISIBILITIES.includes(visibility)) {
    throw serviceError('not_found', 'Gizlilik ayarları bulunamadı.');
  }
  return {
    visibility,
    zones: ((zones.data ?? []) as ZoneRow[]).map((z) => ({
      id: z.id,
      label: z.label,
      lat: Number(z.center_lat),
      lng: Number(z.center_lng),
      radiusM: Number(z.radius_m),
    })),
  };
}

export function createSupabasePrivacyService(): PrivacyService {
  return {
    getSettings: () => guard(async () => fetchSettings(await requireUserId())),

    setVisibility: (visibility) =>
      guard(async () => {
        if (!VISIBILITIES.includes(visibility)) throw serviceError('invalid', 'Görünürlük değeri geçersiz.');
        const userId = await requireUserId();
        const { data, error } = await supabase
          .from('users_profile')
          .update({ visibility })
          .eq('id', userId)
          .select('id');
        throwIfError(error);
        if (!data || data.length === 0) throw serviceError('not_found', 'Profil bulunamadı.');
        return fetchSettings(userId);
      }),

    addZone: (zone) =>
      guard(async () => {
        const label = validateZone(zone);
        const userId = await requireUserId();
        // İstemci tarafı sınır (sunucuda yok, backend notu); yarış durumunda ufak aşım mümkün.
        const { count, error: countError } = await supabase
          .from('privacy_zones')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);
        throwIfError(countError);
        if (count === null || count === undefined) throw serviceError('network');
        assertZoneCapacity(count);
        const { error } = await supabase.from('privacy_zones').insert({
          user_id: userId,
          label,
          center: toPointWkt(zone.lat, zone.lng),
          radius_m: zone.radiusM,
        });
        throwIfError(error);
        return fetchSettings(userId);
      }),

    removeZone: (zoneId) =>
      guard(async () => {
        const userId = await requireUserId();
        const { data, error } = await supabase
          .from('privacy_zones')
          .delete()
          .eq('id', zoneId)
          .eq('user_id', userId)
          .select('id');
        throwIfError(error, { badIdIsNotFound: true });
        if (!data || data.length === 0) throw serviceError('not_found', 'Bu gizlilik bölgesi bulunamadı.');
        return fetchSettings(userId);
      }),
  };
}

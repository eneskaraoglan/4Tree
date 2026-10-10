import type { PrivacySettings, PrivacyZone, Visibility } from '@/types';
import type { PrivacyService } from '../PrivacyService';
import { supabase } from './supabaseClient';
import { MOCK_PRIVACY } from '../mock/mockPrivacy';

export function createSupabasePrivacyService(): PrivacyService {
  return {
    getSettings: async (): Promise<PrivacySettings> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return MOCK_PRIVACY;
        }

        const { data: profile } = await supabase
          .from('users_profile')
          .select('visibility')
          .eq('id', user.id)
          .maybeSingle();

        const { data: zonesData } = await supabase
          .from('privacy_zones')
          .select('*')
          .eq('user_id', user.id);

        const visibility: Visibility = profile?.visibility || 'friends';
        const zones: PrivacyZone[] = (zonesData || []).map((z: any) => ({
          id: z.id,
          label: z.label,
          lat: Number(z.center_lat),
          lng: Number(z.center_lng),
          radiusM: Number(z.radius_m),
        }));

        return { visibility, zones };
      } catch (e) {
        return MOCK_PRIVACY;
      }
    },

    setVisibility: async (visibility: Visibility): Promise<PrivacySettings> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('users_profile').update({ visibility }).eq('id', user.id);
      }
      return createSupabasePrivacyService().getSettings();
    },

    addZone: async (zone: Omit<PrivacyZone, 'id'>): Promise<PrivacySettings> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('privacy_zones').insert({
          user_id: user.id,
          label: zone.label,
          center_lat: zone.lat,
          center_lng: zone.lng,
          radius_m: zone.radiusM,
        });
      }
      return createSupabasePrivacyService().getSettings();
    },

    removeZone: async (zoneId: string): Promise<PrivacySettings> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('privacy_zones').delete().match({ id: zoneId, user_id: user.id });
      }
      return createSupabasePrivacyService().getSettings();
    },
  };
}

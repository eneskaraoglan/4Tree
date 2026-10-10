import type { Profile } from '@/types';
import { getLevelProgress } from '../levels';
import type { ProfileService } from '../ProfileService';
import { supabase } from './supabaseClient';
import { buildMockProfile } from '../mock/mockProfile';

export function createSupabaseProfileService(): ProfileService {
  return {
    getProfile: async (): Promise<Profile> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return buildMockProfile([]);
        }

        const { data, error } = await supabase
          .from('users_profile')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (error || !data) {
          return buildMockProfile([]);
        }

        return {
          id: data.id,
          name: data.display_name || 'Kullanıcı',
          avatarInitial: data.avatar_initial || (data.display_name || 'K')[0].toUpperCase(),
          level: data.level || 'seed',
          totalKm: Number(data.total_distance_m ? data.total_distance_m / 1000 : 0),
          totalTrees: Number(data.total_trees || 0),
          activeDays: Number(data.active_days || 0),
        };
      } catch (e) {
        return buildMockProfile([]);
      }
    },
    getLevelProgress: async () => {
      const profile = await createSupabaseProfileService().getProfile();
      return getLevelProgress(profile.totalKm);
    },
  };
}

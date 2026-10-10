import type { Activity } from '@/types';
import type { ActivityService } from '../ActivityService';
import { supabase } from './supabaseClient';
import { buildMockActivities } from '../mock/mockActivities';

export function createSupabaseActivityService(): ActivityService {
  return {
    getActivities: async (): Promise<Activity[]> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return buildMockActivities();
        }

        const { data, error } = await supabase
          .from('runs')
          .select('*')
          .eq('user_id', user.id)
          .order('started_at', { ascending: false });

        if (error || !data || data.length === 0) {
          return buildMockActivities();
        }

        return data.map((row: any) => ({
          id: row.id,
          type: row.type || 'run',
          distanceKm: Number(row.distance_km || 0),
          durationSec: Number(row.duration_sec || 0),
          paceSecPerKm: Number(row.pace_sec_per_km || 0),
          startedAt: row.started_at,
          place: row.place || 'İstanbul',
          route: Array.isArray(row.route) ? row.route : [],
          treesEarned: Number(row.trees_earned || 0),
        }));
      } catch (e) {
        return buildMockActivities();
      }
    },

    getActivity: async (id: string): Promise<Activity | null> => {
      try {
        const { data, error } = await supabase
          .from('runs')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error || !data) {
          const mockList = buildMockActivities();
          return mockList.find((a) => a.id === id) || null;
        }

        return {
          id: data.id,
          type: data.type || 'run',
          distanceKm: Number(data.distance_km || 0),
          durationSec: Number(data.duration_sec || 0),
          paceSecPerKm: Number(data.pace_sec_per_km || 0),
          startedAt: data.started_at,
          place: data.place || 'İstanbul',
          route: Array.isArray(data.route) ? data.route : [],
          treesEarned: Number(data.trees_earned || 0),
        };
      } catch (e) {
        return null;
      }
    },

    saveActivity: async (newAct) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('runs')
        .insert({
          user_id: user.id,
          type: newAct.type || 'run',
          duration_sec: newAct.durationSec,
          started_at: newAct.startedAt || new Date().toISOString(),
          place: newAct.place || 'İstanbul',
          route: newAct.route || [],
        })
        .select()
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Aktivite kaydedilemedi');
      }

      return {
        id: data.id,
        type: data.type || 'run',
        distanceKm: Number(data.distance_km || 0),
        durationSec: Number(data.duration_sec || 0),
        paceSecPerKm: Number(data.pace_sec_per_km || 0),
        startedAt: data.started_at,
        place: data.place || 'İstanbul',
        route: Array.isArray(data.route) ? data.route : [],
        treesEarned: Number(data.trees_earned || 0),
      };
    },
  };
}

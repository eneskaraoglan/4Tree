import type { ForestTree } from '@/types';
import type { ForestService } from '../ForestService';
import { supabase } from './supabaseClient';
import { buildMockTrees } from '../mock/mockForest';
import { buildMockActivities } from '../mock/mockActivities';

export function createSupabaseForestService(): ForestService {
  return {
    getTrees: async (): Promise<ForestTree[]> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return buildMockTrees(buildMockActivities());
        }

        const { data, error } = await supabase
          .from('user_trees')
          .select('*')
          .eq('user_id', user.id)
          .order('planted_at', { ascending: false });

        if (error || !data || data.length === 0) {
          return buildMockTrees(buildMockActivities());
        }

        return data.map((row: any) => ({
          id: row.id,
          species: row.species || 'Meşe',
          plantedAt: row.planted_at,
          region: row.region || 'Çanakkale Hatıra Ormanı',
          sponsor: row.sponsor || 'TEMA Vakfı',
          certificateNo: row.certificate_no || `TREE-${row.id.slice(0, 8)}`,
          isSample: true,
        }));
      } catch (e) {
        return buildMockTrees(buildMockActivities());
      }
    },
  };
}

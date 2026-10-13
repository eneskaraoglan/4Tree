import type { ForestTree } from '@/types';

import type { ForestService } from '../ForestService';
import { guard, requireUserId, throwIfError } from './supabaseHelpers';
import { supabase } from './supabaseClient';

/** Şemada bölge/sponsor/sertifika yok; bunlar TEMSİLİDİR (isSample her zaman true). */
const SAMPLE_REGION = 'Temsili dikim bölgesi';

type TreeTypeRef = { name: string | null };
type TreeRow = {
  id: string;
  planted_at: string;
  tree_type_id: string;
  /** Çoktan-bire ilişki nesne döner; istemci sürümüne göre tek elemanlı dizi de olabilir. */
  tree_types: TreeTypeRef | TreeTypeRef[] | null;
};

function toTree(row: TreeRow): ForestTree {
  const type = Array.isArray(row.tree_types) ? row.tree_types[0] : row.tree_types;
  return {
    id: row.id,
    species: type?.name ?? row.tree_type_id,
    plantedAt: row.planted_at,
    region: SAMPLE_REGION,
    certificateNo: `ORNEK-${row.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
    isSample: true,
  };
}

export function createSupabaseForestService(): ForestService {
  return {
    getTrees: () =>
      guard(async () => {
        const userId = await requireUserId();
        const { data, error } = await supabase
          .from('user_trees')
          .select('id, planted_at, tree_type_id, tree_types(name)')
          .eq('user_id', userId)
          .order('planted_at', { ascending: false });
        throwIfError(error);
        return ((data ?? []) as unknown as TreeRow[]).map(toTree);
      }),
  };
}

import type { ForestTree } from '@/types';

import type { ForestService } from '../ForestService';

export function createMockForestService(trees: ForestTree[]): ForestService {
  const store = trees.map((t) => ({ ...t }));
  return {
    getTrees: async () => store.map((t) => ({ ...t })),
  };
}

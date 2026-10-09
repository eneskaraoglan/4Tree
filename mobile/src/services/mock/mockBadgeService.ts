import type { Badge } from '@/types';

import type { BadgeService } from '../BadgeService';

export function createMockBadgeService(badges: Badge[]): BadgeService {
  const store = badges.map((b) => ({ ...b }));
  return {
    getBadges: async () => store.map((b) => ({ ...b })),
  };
}

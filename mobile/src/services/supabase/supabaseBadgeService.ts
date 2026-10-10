import type { Badge } from '@/types';
import type { BadgeService } from '../BadgeService';
import { supabase } from './supabaseClient';
import { MOCK_BADGES } from '../mock/mockBadges';

export function createSupabaseBadgeService(): BadgeService {
  return {
    getBadges: async (): Promise<Badge[]> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return MOCK_BADGES;
        }

        const { data: allBadges } = await supabase.from('badges').select('*');
        const { data: userBadges } = await supabase
          .from('user_badges')
          .select('*')
          .eq('user_id', user.id);

        if (!allBadges || allBadges.length === 0) {
          return MOCK_BADGES;
        }

        const earnedMap = new Map<string, string>();
        if (userBadges) {
          userBadges.forEach((ub: any) => {
            earnedMap.set(ub.badge_id, ub.earned_at);
          });
        }

        return allBadges.map((b: any) => {
          const earnedAt = earnedMap.get(b.id);
          return {
            id: b.id,
            name: b.name,
            description: b.description || '',
            earned: !!earnedAt,
            earnedAt: earnedAt || undefined,
          };
        });
      } catch (e) {
        return MOCK_BADGES;
      }
    },
  };
}

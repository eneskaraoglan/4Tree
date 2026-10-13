import type { Badge } from '@/types';

import { BADGE_ORDER } from '../badgeOrder';
import type { BadgeService } from '../BadgeService';
import { guard, requireUserId, throwIfError } from './supabaseHelpers';
import { supabase } from './supabaseClient';

type BadgeRow = { id: string; name: string; description: string | null };
type UserBadgeRow = { badge_id: string; earned_at: string };

export function createSupabaseBadgeService(): BadgeService {
  return {
    getBadges: () =>
      guard(async () => {
        const userId = await requireUserId();
        const [catalog, owned] = await Promise.all([
          supabase.from('badges').select('id, name, description').order('created_at').order('id'),
          supabase.from('user_badges').select('badge_id, earned_at').eq('user_id', userId),
        ]);
        throwIfError(catalog.error);
        throwIfError(owned.error);

        const earnedAt = new Map(((owned.data ?? []) as UserBadgeRow[]).map((r) => [r.badge_id, r.earned_at]));
        const rank = (id: string): number => {
          const index = BADGE_ORDER.indexOf(id);
          return index === -1 ? BADGE_ORDER.length : index;
        };
        // Array.prototype.sort kararlıdır: bilinmeyen rozetler katalog sırasıyla sona gider.
        const ordered = [...((catalog.data ?? []) as BadgeRow[])].sort((a, b) => rank(a.id) - rank(b.id));
        return ordered.map((row): Badge => {
          const earned = earnedAt.get(row.id);
          return {
            id: row.id,
            name: row.name,
            description: row.description ?? '',
            earned: earned !== undefined,
            ...(earned !== undefined ? { earnedAt: earned } : {}),
          };
        });
      }),
  };
}

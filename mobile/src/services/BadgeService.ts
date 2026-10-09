import type { Badge } from '@/types';

export interface BadgeService {
  getBadges(): Promise<Badge[]>;
}

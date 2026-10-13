import type { ActivityService } from './ActivityService';
import type { AuthService } from './AuthService';
import type { BadgeService } from './BadgeService';
import type { FeedService } from './FeedService';
import type { ForestService } from './ForestService';
import type { PrivacyService } from './PrivacyService';
import type { ProfileService } from './ProfileService';

export type Services = {
  profile: ProfileService;
  activity: ActivityService;
  forest: ForestService;
  badge: BadgeService;
  feed: FeedService;
  privacy: PrivacyService;
  auth: AuthService;
};

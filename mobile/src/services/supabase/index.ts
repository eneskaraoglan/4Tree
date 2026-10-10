import type { Services } from '../types';
import { createSupabaseActivityService } from './supabaseActivityService';
import { createSupabaseBadgeService } from './supabaseBadgeService';
import { createSupabaseFeedService } from './supabaseFeedService';
import { createSupabaseForestService } from './supabaseForestService';
import { createSupabasePrivacyService } from './supabasePrivacyService';
import { createSupabaseProfileService } from './supabaseProfileService';

export function createSupabaseServices(): Services {
  return {
    profile: createSupabaseProfileService(),
    activity: createSupabaseActivityService(),
    forest: createSupabaseForestService(),
    badge: createSupabaseBadgeService(),
    feed: createSupabaseFeedService(),
    privacy: createSupabasePrivacyService(),
  };
}

import type { Profile } from '@/types';

import { getLevelProgress } from '../levels';
import type { ProfileService } from '../ProfileService';

export function createMockProfileService(profile: Profile): ProfileService {
  return {
    getProfile: async () => ({ ...profile }),
    getLevelProgress: async () => getLevelProgress(profile.totalKm),
  };
}

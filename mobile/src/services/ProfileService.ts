import type { LevelProgress, Profile } from '@/types';

export interface ProfileService {
  getProfile(): Promise<Profile>;
  getLevelProgress(): Promise<LevelProgress>;
}

import type { FriendshipStatus, Profile } from '@/types';

import { ServiceError } from '../errors';
import { getLevelProgress } from '../levels';
import type { ProfileService } from '../ProfileService';
import { validateProfilePatch } from '../profileRules';
import { buildMockUserProfiles } from './mockProfile';

export function createMockProfileService(initial: Profile): ProfileService {
  let profile: Profile = { ...initial };
  const users = buildMockUserProfiles(profile);

  return {
    getProfile: async () => ({ ...profile }),
    getLevelProgress: async () => getLevelProgress(profile.totalKm),
    updateProfile: async (patch) => {
      profile = { ...profile, ...validateProfilePatch(patch) };
      const self = users.get(profile.id);
      if (self) {
        self.name = profile.name;
        self.avatarInitial = profile.avatarInitial;
      }
      return { ...profile };
    },
    getUserProfile: async (userId: string) => {
      const user = users.get(userId);
      if (!user) throw new ServiceError('not_found', 'Kullanıcı bulunamadı.');
      return { ...user };
    },
    setFriendshipStatus: async (userId: string, status: FriendshipStatus) => {
      const user = users.get(userId);
      if (!user) throw new ServiceError('not_found', 'Kullanıcı bulunamadı.');
      user.friendshipStatus = status;
      return { ...user };
    },
    searchUsers: async (query: string) => {
      const q = query.trim().toLocaleLowerCase('tr');
      if (!q) return [];
      return Array.from(users.values())
        .filter((u) => u.id !== profile.id && u.name.toLocaleLowerCase('tr').includes(q))
        .map((u) => ({ ...u }));
    },
    getFriends: async () => {
      return Array.from(users.values())
        .filter((u) => u.id !== profile.id && u.friendshipStatus === 'friends')
        .map((u) => ({ ...u }));
    },
    getFriendRequests: async () => {
      const all = Array.from(users.values());
      return {
        incoming: all.filter((u) => u.friendshipStatus === 'incoming').map((u) => ({ ...u })),
        outgoing: all.filter((u) => u.friendshipStatus === 'pending').map((u) => ({ ...u })),
      };
    },
    respondFriendRequest: async (userId: string, accept: boolean) => {
      const user = users.get(userId);
      if (!user) throw new ServiceError('not_found', 'Kullanıcı bulunamadı.');
      user.friendshipStatus = accept ? 'friends' : 'none';
    },
  };
}

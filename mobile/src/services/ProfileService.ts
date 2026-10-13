import type { FriendshipStatus, LevelProgress, Profile, UserProfile } from '@/types';

import type { ProfilePatch } from './profileRules';

export type { ProfilePatch } from './profileRules';

export interface ProfileService {
  getProfile(): Promise<Profile>;
  getLevelProgress(): Promise<LevelProgress>;
  /**
   * Ad ve/veya avatar harfini günceller; yalnız verilen alanlar değişir. Güncel profili döner.
   * Ad 2-40 karakter (kırpılmış), avatar tek harf ya da rakam; geçersizse ServiceError('invalid').
   */
  updateProfile(patch: ProfilePatch): Promise<Profile>;
  /** Başka bir kullanıcının profilini döner. Bulunamazsa ServiceError('not_found'). */
  getUserProfile(userId: string): Promise<UserProfile>;
  /** Arkadaşlık durumunu günceller ('none' | 'pending' | 'friends' | 'incoming') ve güncel profili döner. */
  setFriendshipStatus(userId: string, status: FriendshipStatus): Promise<UserProfile>;
  /** Kullanıcı arama (ad / kullanıcı adı). */
  searchUsers(query: string): Promise<UserProfile[]>;
  /** Mevcut arkadaşların listesini döner. */
  getFriends(): Promise<UserProfile[]>;
  /** Gelen ve giden arkadaşlık isteklerini döner. */
  getFriendRequests(): Promise<{ incoming: UserProfile[]; outgoing: UserProfile[] }>;
  /** Gelen arkadaşlık isteğini kabul eder veya reddeder. */
  respondFriendRequest(userId: string, accept: boolean): Promise<void>;
}

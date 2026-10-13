/** Seviye kimlikleri; görünen Türkçe adlar (Tohum, Fidan, Ağaç, Orman) i18n'den gelir. */
export type LevelName = 'seed' | 'sapling' | 'tree' | 'forest';

export type Profile = {
  id: string;
  name: string;
  /** Avatarda gösterilen baş harf. */
  avatarInitial: string;
  level: LevelName;
  totalKm: number;
  totalTrees: number;
  activeDays: number;
  /** Üyelik başlangıcı (ISO 8601). Bilinmiyorsa yok. */
  joinedAt?: string;
};

export type LevelProgress = {
  level: LevelName;
  /** Bir sonraki seviye; son seviyedeyse null. */
  nextLevel: LevelName | null;
  /** Bir sonraki seviyeye ilerleme, 0-1. Son seviyede 1. */
  progress: number;
};

export type FriendshipStatus = 'none' | 'pending' | 'friends' | 'incoming';

export type UserProfile = {
  id: string;
  name: string;
  avatarInitial: string;
  level: LevelName;
  totalKm: number;
  totalTrees: number;
  activeDays: number;
  visibility: 'public' | 'friends' | 'private';
  friendshipStatus: FriendshipStatus;
  joinedAt?: string;
};

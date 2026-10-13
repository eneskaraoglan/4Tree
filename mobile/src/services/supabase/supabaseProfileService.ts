import type { FriendshipStatus, Profile, UserProfile } from '@/types';

import { getLevelProgress } from '../levels';
import type { ProfileService } from '../ProfileService';
import { deriveAvatarInitial, validateProfilePatch } from '../profileRules';
import { guard, requireUserId, serviceError, throwIfError } from './supabaseHelpers';
import { supabase } from './supabaseClient';

// `level` sütunu şemada yok (backend notu); seviye toplam km'den hesaplanır.
const PROFILE_COLUMNS =
  'id, display_name, avatar_initial, total_distance_m, total_trees, active_days, created_at, visibility';

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_initial: string | null;
  /** bigint: PostgREST büyük değerlerde string dönebilir; Number() ile okunur. */
  total_distance_m: number | string | null;
  total_trees: number | string | null;
  active_days: number | string | null;
  created_at: string | null;
  visibility?: 'public' | 'friends' | 'private' | null;
};

function toProfile(row: ProfileRow): Profile {
  const totalKm = Number(row.total_distance_m ?? 0) / 1000;
  const name = row.display_name?.trim() || 'Kullanıcı';
  return {
    id: row.id,
    name,
    avatarInitial: row.avatar_initial?.trim() || deriveAvatarInitial(name) || Array.from(name)[0],
    level: getLevelProgress(totalKm).level,
    totalKm,
    totalTrees: Number(row.total_trees ?? 0),
    activeDays: Number(row.active_days ?? 0),
    joinedAt: row.created_at || undefined,
  };
}

function toUserProfile(row: ProfileRow, friendshipStatus: FriendshipStatus): UserProfile {
  const totalKm = Number(row.total_distance_m ?? 0) / 1000;
  const name = row.display_name?.trim() || 'Kullanıcı';
  return {
    id: row.id,
    name,
    avatarInitial: row.avatar_initial?.trim() || deriveAvatarInitial(name) || Array.from(name)[0],
    level: getLevelProgress(totalKm).level,
    totalKm,
    totalTrees: Number(row.total_trees ?? 0),
    activeDays: Number(row.active_days ?? 0),
    visibility: row.visibility ?? 'public',
    friendshipStatus,
    joinedAt: row.created_at || undefined,
  };
}

async function fetchProfile(): Promise<Profile> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('users_profile')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();
  throwIfError(error);
  if (!data) throw serviceError('not_found', 'Profil bulunamadı.');
  return toProfile(data as ProfileRow);
}

async function updateProfile(patch: Parameters<ProfileService['updateProfile']>[0]): Promise<Profile> {
  const valid = validateProfilePatch(patch);
  const changes: { display_name?: string; avatar_initial?: string } = {};
  if (valid.name !== undefined) changes.display_name = valid.name;
  if (valid.avatarInitial !== undefined) changes.avatar_initial = valid.avatarInitial;
  if (Object.keys(changes).length === 0) return fetchProfile();

  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('users_profile')
    .update(changes)
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .maybeSingle();
  throwIfError(error);
  if (!data) throw serviceError('not_found', 'Profil bulunamadı.');
  return toProfile(data as ProfileRow);
}

async function checkIsFriend(currentUserId: string, targetUserId: string): Promise<boolean> {
  if (currentUserId === targetUserId) return true;
  const { data } = await supabase
    .from('friendships')
    .select('user_id')
    .or(`and(user_id.eq.${currentUserId},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${currentUserId})`)
    .limit(1);
  return (data && data.length > 0) || false;
}

async function fetchUserProfile(targetUserId: string): Promise<UserProfile> {
  const currentUserId = await requireUserId();
  const isFriend = await checkIsFriend(currentUserId, targetUserId);
  const { data, error } = await supabase
    .from('users_profile')
    .select(PROFILE_COLUMNS)
    .eq('id', targetUserId)
    .maybeSingle();
  throwIfError(error, { badIdIsNotFound: true });
  if (!data) throw serviceError('not_found', 'Kullanıcı bulunamadı.');
  const row = data as unknown as ProfileRow;
  return toUserProfile(row, isFriend ? 'friends' : 'none');
}

export function createSupabaseProfileService(): ProfileService {
  return {
    getProfile: () => guard(fetchProfile),
    getLevelProgress: () => guard(async () => getLevelProgress((await fetchProfile()).totalKm)),
    updateProfile: (patch) => guard(() => updateProfile(patch)),
    getUserProfile: (userId) => guard(() => fetchUserProfile(userId)),
    setFriendshipStatus: (targetUserId, status) =>
      guard(async () => {
        const currentUserId = await requireUserId();
        if (status === 'friends') {
          await supabase.from('friendships').upsert(
            { user_id: currentUserId, friend_id: targetUserId },
            { onConflict: 'user_id,friend_id' },
          );
        } else if (status === 'none') {
          await supabase
            .from('friendships')
            .delete()
            .or(`and(user_id.eq.${currentUserId},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${currentUserId})`);
        }
        return fetchUserProfile(targetUserId);
      }),
    searchUsers: (query) =>
      guard(async () => {
        const currentUserId = await requireUserId();
        const trimmed = query.trim();
        if (!trimmed) return [];
        const { data, error } = await supabase
          .from('users_profile')
          .select(PROFILE_COLUMNS)
          .neq('id', currentUserId)
          .ilike('display_name', `%${trimmed}%`)
          .limit(20);
        throwIfError(error);
        const rows = (data ?? []) as unknown as ProfileRow[];
        return Promise.all(
          rows.map(async (row) => {
            const isFriend = await checkIsFriend(currentUserId, row.id);
            return toUserProfile(row, isFriend ? 'friends' : 'none');
          }),
        );
      }),
    getFriends: () =>
      guard(async () => {
        const currentUserId = await requireUserId();
        const { data, error } = await supabase
          .from('friendships')
          .select('user_id, friend_id')
          .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`);
        throwIfError(error);
        const friendIds = (data ?? []).map((row: any) =>
          row.user_id === currentUserId ? row.friend_id : row.user_id,
        );
        if (friendIds.length === 0) return [];
        const { data: friendsData, error: friendsError } = await supabase
          .from('users_profile')
          .select(PROFILE_COLUMNS)
          .in('id', friendIds);
        throwIfError(friendsError);
        return ((friendsData ?? []) as unknown as ProfileRow[]).map((r) =>
          toUserProfile(r, 'friends'),
        );
      }),
    getFriendRequests: () =>
      guard(async () => {
        // BACKEND NOTU (Enes): friend_requests tablosu henüz yok; şimdilik boş döner.
        return { incoming: [], outgoing: [] };
      }),
    respondFriendRequest: (userId, accept) =>
      guard(async () => {
        const currentUserId = await requireUserId();
        if (accept) {
          await supabase.from('friendships').upsert(
            { user_id: currentUserId, friend_id: userId },
            { onConflict: 'user_id,friend_id' },
          );
        }
      }),
  };
}

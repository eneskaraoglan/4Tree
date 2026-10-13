import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useServices } from '@/services';
import type { PrivacySettings, Profile } from '@/types';

import { formatSince } from './format';

export type ProfileData = {
  profile: Profile;
  settings: PrivacySettings;
  /** "Aralık 2025'ten beri" satırı; profilde üyelik tarihi yoksa null. */
  sinceLabel: string | null;
};

export type ProfileLoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: ProfileData };

/**
 * Profil ve gizlilik ayarlarını servislerden yükler; üyelik satırı `profile.joinedAt` alanından gelir.
 * Sekme her odaklandığında yeniden yüklenir; içerik zaten varsa sessizce (yükleniyor ya da hata göstermeden).
 */
export function useProfileData() {
  const { profile, privacy } = useServices();
  const [state, setState] = useState<ProfileLoadState>({ status: 'loading' });

  const load = useCallback(() => {
    let active = true;
    (async () => {
      try {
        const [loadedProfile, settings] = await Promise.all([profile.getProfile(), privacy.getSettings()]);
        const sinceLabel = loadedProfile.joinedAt ? formatSince(loadedProfile.joinedAt) : null;
        if (active) setState({ status: 'ready', data: { profile: loadedProfile, settings, sinceLabel } });
      } catch {
        // Dolu içerik varken yenileme hatası içeriği bozmaz.
        if (active) setState((prev) => (prev.status === 'ready' ? prev : { status: 'error' }));
      }
    })();
    return () => {
      active = false;
    };
  }, [profile, privacy]);

  useFocusEffect(load);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    load();
  }, [load]);

  return { state, retry };
}

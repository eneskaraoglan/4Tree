import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useServices } from '@/services';
import type { PrivacySettings, Profile } from '@/types';

import { earliestStartedAt, formatSince } from './format';

export type ProfileData = {
  profile: Profile;
  settings: PrivacySettings;
  /** "Aralık 2025'ten beri" satırı; aktivite yoksa ya da alınamazsa null. */
  sinceLabel: string | null;
};

export type ProfileLoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: ProfileData };

/**
 * Profil, gizlilik ayarları ve (isteğe bağlı) üyelik tarihini servislerden yükler.
 * Sekme her odaklandığında yeniden yüklenir; içerik zaten varsa sessizce (yükleniyor ya da hata göstermeden).
 * Üyelik tarihi için Profile tipinde alan yok: en eski aktivitenin ayı kullanılır (backend notu: `joinedAt`).
 */
export function useProfileData() {
  const { profile, privacy, activity } = useServices();
  const [state, setState] = useState<ProfileLoadState>({ status: 'loading' });

  const load = useCallback(() => {
    let active = true;
    (async () => {
      try {
        const [loadedProfile, settings, since] = await Promise.all([
          profile.getProfile(),
          privacy.getSettings(),
          // Üyelik tarihi süs bilgi: alınamazsa ekran yine de açılır.
          activity
            .getActivities()
            .then((list) => {
              const earliest = earliestStartedAt(list.map((a) => a.startedAt));
              return earliest ? formatSince(earliest) : null;
            })
            .catch(() => null),
        ]);
        if (active) setState({ status: 'ready', data: { profile: loadedProfile, settings, sinceLabel: since } });
      } catch {
        // Dolu içerik varken yenileme hatası içeriği bozmaz.
        if (active) setState((prev) => (prev.status === 'ready' ? prev : { status: 'error' }));
      }
    })();
    return () => {
      active = false;
    };
  }, [profile, privacy, activity]);

  useFocusEffect(load);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    load();
  }, [load]);

  return { state, retry };
}

import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useServices } from '@/services';
import type { Badge, LevelProgress } from '@/types';

export type AchievementsData = { badges: Badge[]; level: LevelProgress };

export type AchievementsState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: AchievementsData };

/**
 * Rozetleri ve seviye ilerlemesini servislerden yükler. Sekme her odaklandığında sessizce yeniden yükler:
 * eski veri ekranda kalır, yenileme hatası onu silmez. İlk yükleme hata verirse `retry` ile denenir.
 */
export function useAchievements(): { state: AchievementsState; retry: () => void } {
  const { badge, profile } = useServices();
  const [state, setState] = useState<AchievementsState>({ status: 'loading' });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(
    (isCurrent: () => boolean) => {
      Promise.all([badge.getBadges(), profile.getLevelProgress()])
        .then(([badges, level]) => {
          if (isCurrent()) setState({ status: 'ready', data: { badges, level } });
        })
        .catch(() => {
          // Eski veri varsa koru; yoksa hata göster.
          if (isCurrent()) setState((prev) => (prev.status === 'ready' ? prev : { status: 'error' }));
        });
    },
    [badge, profile],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      load(() => active);
      return () => {
        active = false;
      };
    }, [load]),
  );

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    load(() => mounted.current);
  }, [load]);

  return { state, retry };
}

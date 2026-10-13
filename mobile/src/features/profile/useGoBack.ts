import { useRouter, type Href } from 'expo-router';
import { useCallback } from 'react';

const PROFILE_HREF = '/(tabs)/profile' as Href;

/** Geri döner; geçmiş yoksa (derin bağlantıyla açılış) Profil sekmesine gider. */
export function useGoBack(): () => void {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(PROFILE_HREF);
  }, [router]);
}

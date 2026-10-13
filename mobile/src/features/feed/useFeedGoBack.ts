import { useRouter, type Href } from 'expo-router';
import { useCallback } from 'react';

const FEED_HREF = '/(tabs)/feed' as Href;

/** Geri döner; geçmiş yoksa (derin bağlantıyla açılış) Feed sekmesine gider. */
export function useFeedGoBack(): () => void {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(FEED_HREF);
  }, [router]);
}

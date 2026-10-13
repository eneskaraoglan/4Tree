import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

import { fontAssets } from './fonts';

/** Fontlar bu sürede gelmezse sistem fontuyla devam edilir. */
export const FONT_LOAD_TIMEOUT_MS = 6000;

// Fontlar yüklenene dek splash açık kalır.
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Fontları yükler. Yüklenince, hata verince ya da zaman aşımında splash'i kapatır ve `true` döner.
 * Hata/zaman aşımında metinler sistem fontuna düşer.
 * `holdSplash` true iken (ör. oturum hâlâ yükleniyor) fontlar hazır olsa da splash açık kalır.
 */
export function useAppFonts(holdSplash = false): boolean {
  const [loaded, error] = useFonts(fontAssets);
  const [timedOut, setTimedOut] = useState(false);
  const ready = loaded || error != null || timedOut;

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), FONT_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready && !holdSplash) SplashScreen.hideAsync().catch(() => {});
  }, [ready, holdSplash]);

  return ready;
}

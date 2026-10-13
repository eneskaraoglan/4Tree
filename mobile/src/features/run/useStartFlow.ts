import { useCallback, useRef, useState } from 'react';
import { Linking } from 'react-native';

import { useActivityEnvironment } from '@/features/activity';

export type StartPhase = 'closed' | 'rationale' | 'requesting' | 'denied';

type Options = {
  /** İzin hazırsa (zaten verilmiş ya da şimdi verildi) aktif aktivite ekranına geçmek için. */
  onGranted: () => void;
};

/**
 * Başla akışı: izin varsa doğrudan geçer; yoksa önce neden gerektiğini açıklar, sonra sistemden ister.
 * Reddedilirse anlaşılır durum ve "Ayarları aç" sunar.
 */
export function useStartFlow({ onGranted }: Options) {
  const { locationSource } = useActivityEnvironment();
  const [phase, setPhase] = useState<StartPhase>('closed');
  const [failed, setFailed] = useState(false);
  const busy = useRef(false);

  const begin = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const permission = await locationSource.getPermission();
      if (permission === 'granted') onGranted();
      else setPhase(permission === 'blocked' ? 'denied' : 'rationale');
    } catch {
      setPhase('rationale');
    } finally {
      busy.current = false;
    }
  }, [locationSource, onGranted]);

  const allow = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setFailed(false);
    setPhase('requesting');
    try {
      const permission = await locationSource.requestPermission();
      if (permission === 'granted') {
        setPhase('closed');
        onGranted();
      } else {
        setPhase('denied');
      }
    } catch {
      setFailed(true);
      setPhase('rationale');
    } finally {
      busy.current = false;
    }
  }, [locationSource, onGranted]);

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
    setPhase('closed');
  }, []);

  const dismiss = useCallback(() => {
    setFailed(false);
    setPhase('closed');
  }, []);

  return { phase, failed, begin, allow, openSettings, dismiss };
}

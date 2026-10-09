import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

const MINUTE_MS = 60_000;

/**
 * Göreli zamanlar için "şimdi". Dakikada bir ve uygulama öne gelince tazelenir; `refreshNow` ile elle tazelenir.
 * `override` verilirse (testler) sabit kalır. `active` false iken (sekme odakta değil) zamanlayıcı ve
 * AppState dinleyicisi kurulmaz; odağa dönünce çağıran `refreshNow` ile tazeler.
 */
export function useNow(override?: Date, active = true): { now: Date; refreshNow: () => void } {
  const [clock, setClock] = useState(() => new Date());
  const refreshNow = useCallback(() => setClock(new Date()), []);

  useEffect(() => {
    if (override || !active) return undefined;
    const timer = setInterval(refreshNow, MINUTE_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshNow();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [override, active, refreshNow]);

  return { now: override ?? clock, refreshNow };
}

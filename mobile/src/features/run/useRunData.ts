import { useCallback, useEffect, useRef, useState } from 'react';

import { useServices, type Services } from '@/services';
import type { Activity, Profile } from '@/types';

export type RunData =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; profile: Profile; activities: Activity[] };

type State = { services: Services; value: RunData };

const LOADING: RunData = { status: 'loading' };

async function fetchRunData(services: Services): Promise<RunData> {
  try {
    const [profile, activities] = await Promise.all([
      services.profile.getProfile(),
      services.activity.getActivities(),
    ]);
    return { status: 'ready', profile, activities };
  } catch (error) {
    return { status: 'error', error };
  }
}

/**
 * Koşu ekranının verisi: profil + aktiviteler, sadece servis arayüzlerinden.
 * - İlk yüklemede ve servis seti değişince `loading`; eski servisin verisi asla gösterilmez.
 * - `retry`: hatadan sonra görünür yeniden yükleme.
 * - `refresh`: ekran odaklanınca sessiz yenileme; hazır veriyi `loading`e düşürmez, hata olursa eski veri kalır.
 */
export function useRunData(): RunData & { retry: () => void; refresh: () => void } {
  const services = useServices();
  const [state, setState] = useState<State>({ services, value: LOADING });
  const [attempt, setAttempt] = useState(0);
  // Sadece en son istek sonucu uygulanır; unmount sonrası hiçbir sonuç uygulanmaz.
  const requestId = useRef(0);
  const mounted = useRef(true);
  const statusRef = useRef<RunData['status']>('loading');

  // Servis seti değiştiyse state eskidir: yeni yükleme bitene dek loading gösterilir.
  const value = state.services === services ? state.value : LOADING;

  useEffect(() => {
    statusRef.current = value.status;
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    // Bağımlılık değişince (servis seti, yeniden dene) önceki yükleme bu bayrakla geçersiz olur.
    let cancelled = false;
    const id = ++requestId.current;
    fetchRunData(services).then((result) => {
      if (!cancelled && mounted.current && requestId.current === id) setState({ services, value: result });
    });
    return () => {
      cancelled = true;
    };
  }, [services, attempt]);

  const retry = useCallback(() => {
    setState({ services, value: LOADING });
    setAttempt((n) => n + 1);
  }, [services]);

  const refresh = useCallback(() => {
    if (statusRef.current === 'loading') return;
    if (statusRef.current === 'error') {
      retry();
      return;
    }
    const id = ++requestId.current;
    fetchRunData(services).then((result) => {
      if (mounted.current && requestId.current === id && result.status === 'ready') setState({ services, value: result });
    });
  }, [services, retry]);

  return { ...value, retry, refresh };
}

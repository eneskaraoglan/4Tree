import { useCallback, useEffect, useState } from 'react';

import { useServices } from '@/services';
import type { Profile } from '@/types';

export type ProfileLoad = { status: 'loading' } | { status: 'error' } | { status: 'ready'; profile: Profile };

/** Düzenleme ekranı için güncel profili bir kez yükler (form açıkken yenilenmez: yazılanlar kaybolmasın). */
export function useProfileLoad() {
  const { profile: service } = useServices();
  const [state, setState] = useState<ProfileLoad>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    service
      .getProfile()
      .then((profile) => active && setState({ status: 'ready', profile }))
      .catch(() => active && setState({ status: 'error' }));
    return () => {
      active = false;
    };
  }, [service, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry };
}

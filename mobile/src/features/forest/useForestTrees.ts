import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useServices } from '@/services';
import type { ForestTree } from '@/types';

export type ForestState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; trees: ForestTree[] };

/**
 * Ormanı ForestService'ten yükler. Ekran her odaklandığında sessizce yeniden yükler (yeni kazanılan
 * ağaç görünsün); bu sırada eski veri korunur ve hata olursa ekran bozulmaz. `reload` hata sonrası
 * görünür yükleme ile yeniden dener.
 */
export function useForestTrees(): { state: ForestState; reload: () => void } {
  const { forest } = useServices();
  const [state, setState] = useState<ForestState>({ status: 'loading' });
  const mounted = useRef(true);
  /** Geç gelen eski yanıt yenisini ezmesin diye her istek numaralanır. */
  const latestRequest = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(() => {
    const request = ++latestRequest.current;
    const isCurrent = () => mounted.current && request === latestRequest.current;
    forest
      .getTrees()
      .then((trees) => {
        if (isCurrent()) setState({ status: 'ready', trees });
      })
      .catch(() => {
        if (isCurrent()) setState((prev) => (prev.status === 'ready' ? prev : { status: 'error' }));
      });
  }, [forest]);

  useFocusEffect(load);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    load();
  }, [load]);

  return { state, reload };
}

import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as ExpoRouter from 'expo-router';
import type { ReactNode } from 'react';

import { createMockServices, ServicesProvider, type Services } from '@/services';
import type { ForestTree } from '@/types';

import { useForestTrees } from './useForestTrees';

// Ekran bağlanınca odaklı sayılır; `refocus()` sekmeye geri dönmeyi taklit eder.
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  const listeners = new Set<() => void>();
  return {
    useFocusEffect: (callback: () => void) =>
      useEffect(() => {
        listeners.add(callback);
        callback();
        return () => {
          listeners.delete(callback);
        };
      }, [callback]),
    refocus: () => listeners.forEach((listener) => listener()),
  };
});
const refocus = () => (ExpoRouter as unknown as { refocus: () => void }).refocus();

function wrapperFor(services: Services) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <ServicesProvider services={services}>{children}</ServicesProvider>;
  };
}

describe('useForestTrees', () => {
  it('önce loading, sonra ready verir', async () => {
    const services = createMockServices();
    const expected = await services.forest.getTrees();
    let resolve: (trees: ForestTree[]) => void = () => {};
    const pending = new Promise<ForestTree[]>((r) => {
      resolve = r;
    });
    const { result } = await renderHook(() => useForestTrees(), {
      wrapper: wrapperFor({ ...services, forest: { getTrees: () => pending } }),
    });

    expect(result.current.state.status).toBe('loading');
    await act(async () => resolve(expected));
    expect(result.current.state).toEqual({ status: 'ready', trees: expected });
  });

  it('servis hata verirse error olur, reload ile toparlanır', async () => {
    const services = createMockServices({ scenario: 'error' });
    const healthy = createMockServices();
    const { result } = await renderHook(() => useForestTrees(), { wrapper: wrapperFor(services) });
    await waitFor(() => expect(result.current.state.status).toBe('error'));

    services.forest.getTrees = healthy.forest.getTrees;
    await act(async () => result.current.reload());

    await waitFor(() => expect(result.current.state.status).toBe('ready'));
  });

  it('odaklanınca sessizce yeniden yükler: loading görünmez, yeni ağaç listeye girer', async () => {
    const services = createMockServices();
    const all = await services.forest.getTrees();
    let current: ForestTree[] = all.slice(1);
    const getTrees = jest.fn(async () => current);
    const { result } = await renderHook(() => useForestTrees(), {
      wrapper: wrapperFor({ ...services, forest: { getTrees } }),
    });
    await waitFor(() => expect(result.current.state).toEqual({ status: 'ready', trees: all.slice(1) }));

    current = all;
    await act(async () => refocus());

    expect(result.current.state.status).toBe('ready');
    await waitFor(() => expect(result.current.state).toEqual({ status: 'ready', trees: all }));
    expect(getTrees).toHaveBeenCalledTimes(2);
  });

  it('sessiz yeniden yükleme başarısız olursa eski veri korunur', async () => {
    const services = createMockServices();
    const all = await services.forest.getTrees();
    const getTrees = jest.fn<Promise<ForestTree[]>, []>().mockResolvedValueOnce(all).mockRejectedValue(new Error('ağ yok'));
    const { result } = await renderHook(() => useForestTrees(), {
      wrapper: wrapperFor({ ...services, forest: { getTrees } }),
    });
    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    await act(async () => refocus());

    await waitFor(() => expect(getTrees).toHaveBeenCalledTimes(2));
    expect(result.current.state).toEqual({ status: 'ready', trees: all });
  });

  it('unmount sonrası gelen yanıt state`i güncellemez', async () => {
    let resolve: (trees: ForestTree[]) => void = () => {};
    const pending = new Promise<ForestTree[]>((r) => {
      resolve = r;
    });
    const services: Services = { ...createMockServices(), forest: { getTrees: () => pending } };
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result, unmount } = await renderHook(() => useForestTrees(), { wrapper: wrapperFor(services) });
    await unmount();
    await act(async () => resolve([]));

    expect(result.current.state.status).toBe('loading');
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

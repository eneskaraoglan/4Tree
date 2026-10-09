import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ServicesProvider, createMockServices, type Services } from '@/services';
import type { Badge, LevelProgress } from '@/types';

import { useAchievements } from './useAchievements';

// Gerçek useFocusEffect bir navigator ister; burada odaklanma ve odaktan çıkma elle tetiklenir.
let mockFocusCallback: (() => void | (() => void)) | undefined;
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useEffect } = require('react');
    useEffect(() => {
      mockFocusCallback = callback;
      return callback();
    }, [callback]);
  },
}));

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void };
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const levelA: LevelProgress = { level: 'sapling', nextLevel: 'tree', progress: 0.3 };
const levelB: LevelProgress = { level: 'tree', nextLevel: 'forest', progress: 0.1 };

function wrapperFor(services: Services) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <ServicesProvider services={services}>{children}</ServicesProvider>;
  };
}

describe('useAchievements', () => {
  beforeEach(() => {
    mockFocusCallback = undefined;
  });

  it('ilk yüklemede loading, sonra ready verir', async () => {
    const services = createMockServices();
    const pending = deferred<LevelProgress>();
    const getLevelProgress = jest.fn<Promise<LevelProgress>, []>().mockReturnValue(pending.promise);
    const patched: Services = { ...services, profile: { ...services.profile, getLevelProgress } };
    const { result } = await renderHook(() => useAchievements(), { wrapper: wrapperFor(patched) });
    expect(result.current.state.status).toBe('loading');
    await act(async () => {
      pending.resolve(levelA);
      await pending.promise;
    });
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
  });

  it('yeniden odaklanınca yenileme yeni veriyi yansıtır', async () => {
    const services = createMockServices();
    const getLevelProgress = jest.fn<Promise<LevelProgress>, []>().mockResolvedValue(levelA);
    const patched: Services = { ...services, profile: { ...services.profile, getLevelProgress } };
    const { result } = await renderHook(() => useAchievements(), { wrapper: wrapperFor(patched) });
    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    getLevelProgress.mockResolvedValue(levelB);
    await act(async () => {
      mockFocusCallback?.();
    });

    await waitFor(() => {
      const state = result.current.state;
      expect(state.status === 'ready' && state.data.level).toEqual(levelB);
    });
  });

  it('yenileme hatası eski veriyi silmez', async () => {
    const services = createMockServices();
    const getBadges = jest.fn<Promise<Badge[]>, []>().mockImplementation(() => services.badge.getBadges());
    const patched: Services = { ...services, badge: { ...services.badge, getBadges } };
    const { result } = await renderHook(() => useAchievements(), { wrapper: wrapperFor(patched) });
    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    getBadges.mockRejectedValue(new Error('ağ yok'));
    await act(async () => {
      mockFocusCallback?.();
    });
    expect(getBadges).toHaveBeenCalledTimes(2);
    expect(result.current.state.status).toBe('ready');
  });

  it('odak temizlenince (ekrandan çıkınca) gecikmiş yanıt atılır', async () => {
    const services = createMockServices();
    const late = deferred<LevelProgress>();
    const getLevelProgress = jest.fn<Promise<LevelProgress>, []>().mockResolvedValueOnce(levelA).mockReturnValueOnce(late.promise);
    const patched: Services = { ...services, profile: { ...services.profile, getLevelProgress } };
    const { result } = await renderHook(() => useAchievements(), { wrapper: wrapperFor(patched) });
    await waitFor(() => expect(result.current.state.status).toBe('ready'));

    // İkinci odak: istek başlar, temizleme fonksiyonu yanıttan önce çağrılır.
    let cleanup: void | (() => void);
    await act(async () => {
      cleanup = mockFocusCallback?.();
    });
    expect(getLevelProgress).toHaveBeenCalledTimes(2);
    await act(async () => {
      if (cleanup) cleanup();
      late.resolve(levelB);
      await late.promise;
    });

    const state = result.current.state;
    expect(state.status === 'ready' && state.data.level).toEqual(levelA);
  });

  it('ilk yükleme hata verirse error, retry ile ready olur', async () => {
    const services = createMockServices();
    const getBadges = jest.fn<Promise<Badge[]>, []>().mockRejectedValueOnce(new Error('ağ yok')).mockImplementation(() => services.badge.getBadges());
    const patched: Services = { ...services, badge: { ...services.badge, getBadges } };
    const { result } = await renderHook(() => useAchievements(), { wrapper: wrapperFor(patched) });
    await waitFor(() => expect(result.current.state.status).toBe('error'));

    await act(async () => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
  });
});

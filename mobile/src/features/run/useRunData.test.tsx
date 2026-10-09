import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { createMockServices, ServicesProvider, type Services } from '@/services';

import { useRunData } from './useRunData';

function wrapperFor(services: Services) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <ServicesProvider services={services}>{children}</ServicesProvider>;
  };
}

/** Dışarıdan çözülebilen profil isteği olan servis seti. */
function deferredServices() {
  const base = createMockServices();
  const pending: ((name: string) => void)[] = [];
  const services: Services = {
    ...base,
    profile: {
      ...base.profile,
      getProfile: async () => {
        const profile = await base.profile.getProfile();
        const name = await new Promise<string>((resolve) => pending.push(resolve));
        return { ...profile, name };
      },
    },
  };
  return { services, pending };
}

describe('useRunData', () => {
  it('önce loading, sonra profil ve aktivitelerle ready olur', async () => {
    const services = createMockServices({ latencyMs: 20 });
    const { result } = await renderHook(() => useRunData(), { wrapper: wrapperFor(services) });
    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.status).toBe('ready'));
    if (result.current.status !== 'ready') throw new Error('hazır olmalı');
    expect(result.current.profile.name).toBe('Elif');
    expect(result.current.activities.length).toBeGreaterThan(0);
  });

  it('servis hata verince error olur; retry yeniden loading yapar', async () => {
    const services = createMockServices({ scenario: 'error', latencyMs: 20 });
    const { result } = await renderHook(() => useRunData(), { wrapper: wrapperFor(services) });
    await waitFor(() => expect(result.current.status).toBe('error'));

    await act(async () => result.current.retry());
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('error'));
  });

  it('refresh hazır veriyi loading yapmaz, yeni veriyi sessizce uygular', async () => {
    const { services, pending } = deferredServices();
    const { result } = await renderHook(() => useRunData(), { wrapper: wrapperFor(services) });
    await waitFor(() => expect(pending).toHaveLength(1));
    await act(async () => pending[0]('Elif'));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => result.current.refresh());
    expect(result.current.status).toBe('ready');
    await waitFor(() => expect(pending).toHaveLength(2));
    await act(async () => pending[1]('Defne'));

    await waitFor(() => {
      if (result.current.status !== 'ready') throw new Error('hazır olmalı');
      expect(result.current.profile.name).toBe('Defne');
    });
  });

  it('yarış: eski refresh geç dönse de yeni sonucu ezmez', async () => {
    const { services, pending } = deferredServices();
    const { result } = await renderHook(() => useRunData(), { wrapper: wrapperFor(services) });
    await waitFor(() => expect(pending).toHaveLength(1));
    await act(async () => pending[0]('Elif'));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => result.current.refresh());
    await act(async () => result.current.refresh());
    await waitFor(() => expect(pending).toHaveLength(3));

    await act(async () => pending[2]('Yeni'));
    await act(async () => pending[1]('Eski'));

    if (result.current.status !== 'ready') throw new Error('hazır olmalı');
    expect(result.current.profile.name).toBe('Yeni');
  });

  it('unmount sonrası dönen istek state güncellemez ve hata fırlatmaz', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { services, pending } = deferredServices();
    const { unmount } = await renderHook(() => useRunData(), { wrapper: wrapperFor(services) });
    await waitFor(() => expect(pending).toHaveLength(1));

    await unmount();
    await act(async () => pending[0]('Elif'));

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('servis seti değişince ready kalmaz: yeni yükleme bitene dek loading', async () => {
    const first = createMockServices();
    const second = deferredServices();
    let current: Services = first;
    const { result, rerender } = await renderHook(() => useRunData(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <ServicesProvider services={current}>{children}</ServicesProvider>
      ),
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));

    current = second.services;
    await rerender({});
    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(second.pending).toHaveLength(1));
    await act(async () => second.pending[0]('Defne'));
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });
});

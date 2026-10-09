import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { useNow } from './useNow';

describe('useNow', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('dakikada bir tazelenir', async () => {
    jest.setSystemTime(new Date(2026, 9, 10, 12, 0, 0));
    const { result } = await renderHook(() => useNow());
    const first = result.current.now.getTime();
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(result.current.now.getTime() - first).toBe(60_000);
  });

  it('refreshNow elle tazeler', async () => {
    jest.setSystemTime(new Date(2026, 9, 10, 12, 0, 0));
    const { result } = await renderHook(() => useNow());
    const first = result.current.now.getTime();
    jest.setSystemTime(new Date(2026, 9, 10, 12, 0, 30));
    await act(async () => result.current.refreshNow());
    expect(result.current.now.getTime() - first).toBe(30_000);
  });

  it('sabit "şimdi" verilirse zamanlayıcı kurmaz ve değişmez', async () => {
    const fixed = new Date(2026, 9, 10, 8, 0);
    const setIntervalSpy = jest.spyOn(globalThis, 'setInterval');
    const { result, unmount } = await renderHook(() => useNow(fixed));
    expect(setIntervalSpy).not.toHaveBeenCalled();
    await act(async () => result.current.refreshNow());
    expect(result.current.now).toBe(fixed);
    await unmount();
  });

  it('kaldırılınca zamanlayıcıyı temizler', async () => {
    const setIntervalSpy = jest.spyOn(globalThis, 'setInterval');
    const clearIntervalSpy = jest.spyOn(globalThis, 'clearInterval');
    const { unmount } = await renderHook(() => useNow());
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60_000);
    await unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('sekme odakta değilken zamanlayıcı kurmaz; odağa dönünce kurar, çıkınca temizler', async () => {
    const setIntervalSpy = jest.spyOn(globalThis, 'setInterval');
    const clearIntervalSpy = jest.spyOn(globalThis, 'clearInterval');
    const { rerender } = await renderHook(({ active }: { active: boolean }) => useNow(undefined, active), {
      initialProps: { active: false },
    });
    expect(setIntervalSpy).not.toHaveBeenCalled();

    await rerender({ active: true });
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60_000);

    await rerender({ active: false });
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('odakta değilken dakika geçse de zaman değişmez', async () => {
    jest.setSystemTime(new Date(2026, 9, 10, 12, 0, 0));
    const { result } = await renderHook(() => useNow(undefined, false));
    const first = result.current.now.getTime();
    await act(async () => {
      jest.advanceTimersByTime(180_000);
    });
    expect(result.current.now.getTime()).toBe(first);
  });

  it("uygulama 'active' olunca tazelenir, arka plana geçince tazelenmez", async () => {
    let handler: ((state: AppStateStatus) => void) | undefined;
    const remove = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      handler = listener as (state: AppStateStatus) => void;
      return { remove };
    });
    jest.setSystemTime(new Date(2026, 9, 10, 12, 0, 0));
    const { result, unmount } = await renderHook(() => useNow());
    const first = result.current.now.getTime();

    jest.setSystemTime(new Date(2026, 9, 10, 12, 0, 20));
    await act(async () => handler?.('background'));
    expect(result.current.now.getTime()).toBe(first);
    await act(async () => handler?.('active'));
    expect(result.current.now.getTime() - first).toBe(20_000);

    await unmount();
    expect(remove).toHaveBeenCalled();
  });
});

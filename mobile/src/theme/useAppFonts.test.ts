import { act, renderHook } from '@testing-library/react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import { FONT_LOAD_TIMEOUT_MS, useAppFonts } from './useAppFonts';

jest.mock('expo-font', () => ({ useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

const mockUseFonts = jest.mocked(useFonts);

describe('useAppFonts', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });
  afterEach(() => jest.useRealTimers());

  it('fontlar yüklenene dek splash açık kalır, sonra kapanır', async () => {
    mockUseFonts.mockReturnValue([false, null]);
    const { result, rerender } = await renderHook(() => useAppFonts());
    expect(result.current).toBe(false);
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();

    mockUseFonts.mockReturnValue([true, null]);
    await rerender({});
    expect(result.current).toBe(true);
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
  });

  it('holdSplash true iken fontlar hazır olsa da splash açık kalır, bırakılınca kapanır', async () => {
    mockUseFonts.mockReturnValue([true, null]);
    const { result, rerender } = await renderHook((hold: boolean) => useAppFonts(hold), { initialProps: true });
    expect(result.current).toBe(true);
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();

    await rerender(false);
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
  });

  it('font hatasında splash kapanır ve uygulama devam eder', async () => {
    mockUseFonts.mockReturnValue([false, new Error('font yüklenemedi')]);
    const { result } = await renderHook(() => useAppFonts());
    expect(result.current).toBe(true);
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
  });

  it('6 sn içinde dönmezse zaman aşımıyla splash kapanır', async () => {
    mockUseFonts.mockReturnValue([false, null]);
    const { result } = await renderHook(() => useAppFonts());
    expect(result.current).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(FONT_LOAD_TIMEOUT_MS);
    });
    expect(result.current).toBe(true);
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
  });
});

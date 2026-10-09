import { act, renderHook } from '@testing-library/react-native';

import { useSheetMotion } from './useSheetMotion';

// Sahte withTiming, tamamlanma geri çağrısını mockFinished değeriyle hemen çağırır.
let mockFinished = true;
jest.mock('react-native-reanimated', () => {
  const base = jest.requireActual('@/components/illustration/reanimatedTestMock').createReanimatedMock();
  const withTiming = <T,>(to: T, _config?: unknown, callback?: (finished: boolean) => void) => {
    callback?.(mockFinished);
    return to;
  };
  return { ...base, withTiming, default: { ...base.default, withTiming } };
});
jest.mock('react-native-worklets', () => jest.requireActual('./testMocks').createWorkletsMock());

describe('useSheetMotion', () => {
  beforeEach(() => {
    mockFinished = true;
  });

  it('kapanış animasyonu bitince onDismiss tam bir kez çağrılır', async () => {
    const onDismiss = jest.fn();
    const { result } = await renderHook(() => useSheetMotion(onDismiss));
    await act(async () => result.current.requestClose());
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('animasyon yarıda kesilirse (finished=false) onDismiss çağrılmaz', async () => {
    mockFinished = false;
    const onDismiss = jest.fn();
    const { result } = await renderHook(() => useSheetMotion(onDismiss));
    await act(async () => result.current.requestClose());
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

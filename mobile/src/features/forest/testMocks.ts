/**
 * Orman testleri için Reanimated/Worklets sahteleri (`jest.mock` fabrikalarından kullanılır).
 * Paylaşılan sahte `withTiming` tamamlanma geri çağrısını çalıştırmaz; burada geri çağrı hemen
 * (animasyon bitmiş gibi) çalışır, böylece kapanış akışı testte uçtan uca görülür.
 */
import { createReanimatedMock } from '@/components/illustration/reanimatedTestMock';

export function createSheetReanimatedMock() {
  const base = createReanimatedMock();
  const withTiming = <T,>(to: T, _config?: unknown, callback?: (finished: boolean) => void) => {
    callback?.(true);
    return to;
  };
  return { ...base, withTiming, default: { ...base.default, withTiming } };
}

export function createWorkletsMock() {
  return { scheduleOnRN: (fn: (...args: unknown[]) => void, ...args: unknown[]) => fn(...args) };
}

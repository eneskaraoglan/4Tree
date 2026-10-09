import { useReducedMotion } from 'react-native-reanimated';

/** Süs animasyonu çalışabilir mi: istek açık ve sistemde "Hareketi azalt" kapalı. */
export function useMotionEnabled(requested: boolean): boolean {
  const reduceMotion = useReducedMotion();
  return requested && !reduceMotion;
}

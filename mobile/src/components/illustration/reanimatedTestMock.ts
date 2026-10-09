/**
 * Jest için hafif Reanimated sahtesi: `jest.mock('react-native-reanimated', ...)` fabrikasından kullanılır.
 * Gerçek paket jest'te yerel worklets modülünü ister; burada animasyon API'leri JS'te senkron çalışır,
 * böylece worklet gövdeleri (useAnimatedProps içindekiler) da testte yürütülür.
 * `setReducedMotion` ile sistem "Hareketi azalt" ayarı taklit edilir.
 */
import { createElement, forwardRef, type ComponentType } from 'react';
import { View } from 'react-native';

let reduced = false;

export function setReducedMotion(value: boolean) {
  reduced = value;
}

/**
 * Animasyonlu yolun kullanılıp kullanılmadığını sayar: useAnimatedProps (halka/ağaç çizimi) ve
 * withTiming/withRepeat/withSequence (sallanma, açılış). Reduce Motion testleri bunun 0 kalmasını bekler.
 */
const calls = { animatedProps: 0, timing: 0, repeat: 0, sequence: 0 };

export function resetMotionCalls() {
  calls.animatedProps = 0;
  calls.timing = 0;
  calls.repeat = 0;
  calls.sequence = 0;
}

export function getMotionCalls() {
  return { ...calls };
}

type Ease = (t: number) => number;

const Easing = {
  linear: ((t) => t) as Ease,
  sin: ((t) => 1 - Math.cos((t * Math.PI) / 2)) as Ease,
  cubic: ((t) => t * t * t) as Ease,
  back: (s = 1.70158): Ease => (t) => t * t * ((s + 1) * t - s),
  in: (f: Ease): Ease => f,
  out: (f: Ease): Ease => (t) => 1 - f(1 - t),
  inOut: (f: Ease): Ease => (t) => (t < 0.5 ? f(t * 2) / 2 : 1 - f((1 - t) * 2) / 2),
};

export function createReanimatedMock() {
  const AnimatedView = forwardRef<unknown, Record<string, unknown>>(function AnimatedView(props, ref) {
    // `animatedProps` ve stil dönüşümleri testte gerekmez; kalan prop'lar View'a gider.
    return createElement(View, { ...props, ref } as never);
  });

  const mock = {
    __esModule: true,
    Easing,
    useReducedMotion: () => reduced,
    useSharedValue: <T,>(init: T) => ({ value: init }),
    useAnimatedProps: <T,>(factory: () => T) => {
      calls.animatedProps += 1;
      return factory();
    },
    useAnimatedStyle: <T,>(factory: () => T) => factory(),
    withTiming: <T,>(to: T) => {
      calls.timing += 1;
      return to;
    },
    withRepeat: <T,>(animation: T) => {
      calls.repeat += 1;
      return animation;
    },
    withSequence: <T,>(...animations: T[]) => {
      calls.sequence += 1;
      return animations[animations.length - 1];
    },
    createAnimatedComponent: (Component: ComponentType<never>) => Component,
    View: AnimatedView,
  };
  return { ...mock, default: mock };
}

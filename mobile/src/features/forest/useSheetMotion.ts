import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, useWindowDimensions } from 'react-native';
import {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { createDragConfig } from './sheetDrag';

export const OPEN_MS = 320;
const CLOSE_MS = 240;
const SNAP_BACK_MS = 180;
const BACKDROP_OPACITY = 0.72;

/** Paylaşılan değere JS'ten yazar (React Compiler kuralı için tek yerde). */
function assign(value: SharedValue<number>, next: number) {
  value.value = next;
}

/**
 * Alt sheet hareketi: açılış/kapanış kayması, arka plan kararması ve aşağı sürükleyerek kapatma.
 * "Hareketi azalt" açıkken kayma yok; sheet anında açılır ve kapanır.
 * `onDismiss`, kapanış animasyonu bitince tam bir kez çağrılır.
 */
export function useSheetMotion(onDismiss: () => void) {
  const { height: windowHeight } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  const drag = useSharedValue(0);
  const [closing, setClosing] = useState(false);

  // Üst bileşen her render'da yeni onDismiss verebilir; efektler buna bağlanmaz.
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);
  const callDismiss = useCallback(() => dismissRef.current(), []);

  useEffect(() => {
    if (!reduceMotion) assign(progress, withTiming(1, { duration: OPEN_MS, easing: Easing.out(Easing.cubic) }));
  }, [progress, reduceMotion]);

  useEffect(() => {
    if (!closing) return;
    if (reduceMotion) {
      callDismiss();
      return;
    }
    // Tamamlanma geri çağrısı UI iş parçacığında çalışır; JS tarafına scheduleOnRN ile döner.
    assign(
      progress,
      withTiming(0, { duration: CLOSE_MS, easing: Easing.in(Easing.cubic) }, (finished) => {
        'worklet';
        // Animasyon yarıda kesilirse (örn. yeniden açılma) sayfa kapatılmaz.
        if (finished) scheduleOnRN(callDismiss);
      }),
    );
  }, [closing, progress, reduceMotion, callDismiss]);

  const requestClose = useCallback(() => setClosing(true), []);

  const panHandlers = useMemo(
    () =>
      PanResponder.create(
        createDragConfig({
          closing,
          setDrag: (dy) => assign(drag, dy),
          snapBack: () => assign(drag, withTiming(0, { duration: SNAP_BACK_MS })),
          onClose: () => setClosing(true),
        }),
      ).panHandlers,
    [drag, closing],
  );

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value * BACKDROP_OPACITY }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * windowHeight + drag.value }],
  }));

  return { backdropStyle, sheetStyle, panHandlers, requestClose, windowHeight, reduceMotion };
}

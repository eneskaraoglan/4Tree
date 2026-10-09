import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

/** Sekme odaklanınca ve uygulama öne gelince (`active`) `onRefresh` çağrılır. */
export function useRunRefresh(onRefresh: () => void) {
  useFocusEffect(
    useCallback(() => {
      onRefresh();
    }, [onRefresh]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') onRefresh();
    });
    return () => subscription.remove();
  }, [onRefresh]);
}

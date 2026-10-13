import { AccessibilityInfo, Platform } from 'react-native';

/** Native ref'i; `sendAccessibilityEvent` ana makine (host) örneği ister. */
type NativeTarget = Parameters<typeof AccessibilityInfo.sendAccessibilityEvent>[0];

/** Web'de react-native-web ref'i gerçek DOM öğesidir. */
type DomTarget = {
  focus?: (options?: { preventScroll?: boolean }) => void;
  hasAttribute?: (name: string) => boolean;
  setAttribute?: (name: string, value: string) => void;
};

/**
 * Ekran okuyucu odağını verilen öğeye taşır; ref yoksa sessizce geçer.
 * - Native: `AccessibilityInfo.sendAccessibilityEvent(ref, 'focus')` (RN 0.86 önerisi; `setAccessibilityFocus`
 *   kullanımdan kalktı ve `findNodeHandle` gerektirir).
 * - Web: `findNodeHandle` desteklenmez ve çökertir. Öğe DOM'da odaklanabilir değilse `tabindex=-1` verilir
 *   (sadece programatik odak, Tab sırasına girmez), sonra `focus()` çağrılır.
 */
export function focusAccessibility(ref: unknown): void {
  if (ref == null) return;
  if (Platform.OS === 'web') {
    const el = ref as DomTarget;
    if (typeof el.focus !== 'function') return;
    if (el.hasAttribute && el.setAttribute && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
    return;
  }
  AccessibilityInfo.sendAccessibilityEvent(ref as NativeTarget, 'focus');
}

import { AccessibilityInfo, findNodeHandle, type View } from 'react-native';

/** Ekran okuyucu odağını verilen görünüme taşır (web'de ve görünüm yoksa sessizce geçer). */
export function focusAccessibility(view: View | null): void {
  if (!view) return;
  const node = findNodeHandle(view);
  if (node != null) AccessibilityInfo.setAccessibilityFocus(node);
}

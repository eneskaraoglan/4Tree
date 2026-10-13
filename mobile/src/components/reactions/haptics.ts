import * as Haptics from 'expo-haptics';

/** Titreşim ekranın işlevi için gerekli değil: desteklenmeyen cihazda (web) sessizce geçer. */
function safely(run: () => Promise<void>): void {
  try {
    run().catch(() => {});
  } catch {
    // Haptic yok.
  }
}

/** Dokun (Light). */
export const hapticTap = () => safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
/** Seçici açılışı (Medium). */
export const hapticOpen = () => safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
/** Seçici üstünde gezinme ve seçim. */
export const hapticSelect = () => safely(() => Haptics.selectionAsync());

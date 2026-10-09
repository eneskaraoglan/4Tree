import * as Haptics from 'expo-haptics';

/** Tepki dokunuşu (Light). Haptic desteklenmeyen cihazda (web) hata fırlatmaz. */
export function hapticReaction(): void {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  } catch {
    // Titreşim ekranın işlevi için gerekli değil.
  }
}

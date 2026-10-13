import * as Haptics from 'expo-haptics';

/** Haptic desteklenmeyen cihazda (web, bazı emülatörler) hata fırlatmaz. */
function safe(run: () => Promise<void>): void {
  try {
    run().catch(() => {});
  } catch {
    // Titreşim aktivitenin işlevi için gerekli değil.
  }
}

/** Başlat: Heavy. */
export const hapticStart = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
/** Duraklat / devam: Light. */
export const hapticPause = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
/** Bitir: Success. */
export const hapticFinish = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

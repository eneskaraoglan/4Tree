import * as Haptics from 'expo-haptics';

/** Haptic desteklenmeyen cihazda (web, bazı emülatörler) hata fırlatmaz. */
function safe(run: () => Promise<void>): void {
  try {
    run().catch(() => {});
  } catch {
    // Sessizce yut: titreşim ekranın işlevi için gerekli değil.
  }
}

/** Seçim değişti. */
export const hapticSelection = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
/** Bölge eklendi. */
export const hapticSuccess = () =>
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
/** Bölge silindi. */
export const hapticRemove = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

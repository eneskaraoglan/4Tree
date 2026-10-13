import { touch } from '@/theme';

/**
 * Koşarken kullanılan kontroller (Duraklat/Devam/Bitir) için yükseklik: DESIGN.md "koşu sırasında büyük hedefler".
 * Tema token'ı yok; tasarım kararı (>= 64) olarak burada tek yerde.
 */
export const RUN_CONTROL_HEIGHT = 72;
export const MIN_RUN_TARGET = 64;
export const CTA_HEIGHT = touch.cta;
/** Bitir için basılı tutma süresi (ms). */
export const FINISH_HOLD_MS = 800;

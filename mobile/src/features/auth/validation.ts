import { authTr, fill } from '@/i18n';

/** Kayıtta şifrenin en az uzunluğu (ürün kararı). */
export const PASSWORD_MIN_LENGTH = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Hata yoksa null, varsa kullanıcıya gösterilecek Türkçe mesaj. */
export type FieldError = string | null;

export function validateName(value: string): FieldError {
  return value.trim() === '' ? authTr.validation.nameRequired : null;
}

export function validateEmail(value: string): FieldError {
  const email = value.trim();
  if (email === '') return authTr.validation.emailRequired;
  return EMAIL_PATTERN.test(email) ? null : authTr.validation.emailInvalid;
}

/** Girişte yalnız boş olup olmadığına bakılır; uzunluk kuralı yeni şifre belirlerken (kayıt) geçerlidir. */
export function validatePassword(value: string, options: { enforceLength: boolean }): FieldError {
  if (value === '') return authTr.validation.passwordRequired;
  if (options.enforceLength && value.length < PASSWORD_MIN_LENGTH) {
    return fill(authTr.validation.passwordShort, { min: PASSWORD_MIN_LENGTH });
  }
  return null;
}

/**
 * Hatayı ne zaman göstereceğiz: gönderim denendiyse hep; yoksa alandan çıkılmışsa ve alan doluysa.
 * Boş alanın "zorunlu" hatası yalnız gönderimde çıkar: alandan çıkarken beliren mesaj düzeni kaydırıp
 * kullanıcının bastığı butonu yerinden oynatırdı.
 */
export function visibleError(error: FieldError, state: { submitted: boolean; touched: boolean; value: string }): FieldError {
  if (state.submitted) return error;
  return state.touched && state.value !== '' ? error : null;
}

/** Şifre tekrarı: boşsa uyarır, farklıysa "eşleşmiyor" der. */
export function validatePasswordConfirmation(password: string, confirmation: string): FieldError {
  if (confirmation === '') return authTr.validation.confirmRequired;
  return confirmation === password ? null : authTr.validation.passwordMismatch;
}

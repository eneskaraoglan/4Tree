/** Oturum açmış kullanıcının uygulamada gereken özeti. Token'lar servis katmanında kalır, arayüze çıkmaz. */
export type AuthUser = {
  id: string;
  email: string;
  /** Kayıtta verilen ad (yoksa e-postanın @ öncesi). */
  name: string;
};

export type AuthSession = {
  user: AuthUser;
};

/** Oturum yükleniyor mu, açık mı, kapalı mı. */
export type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

export type SignUpInput = { name: string; email: string; password: string };

export type SignInInput = { email: string; password: string };

/** E-posta onayı açıksa kayıt oturum açmaz; kullanıcı önce e-postasındaki bağlantıya dokunur. */
export type SignUpResult = { status: 'signedIn' } | { status: 'confirmationRequired' };

/** Google akışı: oturum açıldı ya da kullanıcı pencereyi kapattı (hata değildir). */
export type GoogleSignInResult = 'signedIn' | 'cancelled';

/**
 * Oturum değişim olayı. `passwordRecovery`: kullanıcı şifre sıfırlama bağlantısıyla uygulamaya döndü ve
 * geçici oturum açıldı; yeni şifre belirlemesi gerekir.
 */
export type AuthEvent = 'initial' | 'signedIn' | 'signedOut' | 'passwordRecovery' | 'other';

/** Uygulamaya dönen e-posta/OAuth bağlantısı: işlendi ya da bu servise ait değil (yok sayıldı). */
export type AuthLinkResult = 'handled' | 'ignored';

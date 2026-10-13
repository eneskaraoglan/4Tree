import type {
  AuthEvent,
  AuthLinkResult,
  AuthSession,
  GoogleSignInResult,
  SignInInput,
  SignUpInput,
  SignUpResult,
} from '@/types';

/**
 * Oturum servisi. Hatalar `ServiceError` olarak döner ve `message` kullanıcıya gösterilebilir Türkçe metindir:
 * - `invalid`: yanlış şifre, geçersiz ya da kayıtlı e-posta, zayıf şifre, çok sık deneme
 * - `network`: sunucuya ulaşılamadı
 * - `unauthenticated`: oturum yok ya da süresi doldu
 */
export interface AuthService {
  /**
   * Kayıtlı oturum; yoksa null. Hata fırlatmaz. Ağ yokken süresi dolmuş olabilecek kayıtlı oturum yine döner
   * (çevrimdışı açılışta kullanıcı çıkış yapmış sayılmaz); gerçekten geçersizse olay dinleyicisi `signedOut` bildirir.
   */
  getSession(): Promise<AuthSession | null>;
  /** Oturum açılınca/kapanınca (çıkış, süre dolması, şifre sıfırlama dönüşü) çağrılır. Dönen fonksiyon aboneliği bırakır. */
  onAuthStateChange(callback: (session: AuthSession | null, event: AuthEvent) => void): () => void;
  signUpWithEmail(input: SignUpInput): Promise<SignUpResult>;
  signInWithEmail(input: SignInInput): Promise<AuthSession>;
  /** Kullanıcı Google penceresini kapatırsa hata fırlatmaz, 'cancelled' döner. */
  signInWithGoogle(): Promise<GoogleSignInResult>;
  /** E-posta kayıtlı olsun olmasın aynı sonuç (hesap varlığı sızdırılmaz). */
  sendPasswordReset(email: string): Promise<void>;
  signOut(): Promise<void>;
  /**
   * Uygulamaya dönen bağlantıyı (fourtree://auth-callback?code=...) işler: e-posta onayı oturum açar,
   * şifre sıfırlama `passwordRecovery` olayı yayar. Bu servise ait olmayan adres için 'ignored' döner.
   * Süresi dolmuş/geçersiz bağlantı `invalid` hatasıdır.
   */
  completeAuthLink(url: string): Promise<AuthLinkResult>;
  /** Oturum açıkken yeni şifre belirler (şifre sıfırlama dönüşü). Oturum yoksa `unauthenticated`. */
  updatePassword(newPassword: string): Promise<void>;
}

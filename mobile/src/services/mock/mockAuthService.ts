import { authTr } from '@/i18n/auth';
import type { AuthEvent, AuthLinkResult, AuthSession, AuthUser, GoogleSignInResult, SignUpResult } from '@/types';

import type { AuthService } from '../AuthService';
import { ServiceError } from '../errors';

export const MOCK_PASSWORD_MIN_LENGTH = 8;

type MockAccount = { user: AuthUser; password: string };

/** Mock'ta hazır bulunan hesap: e-posta elif@ornek.com, şifre agac12345. */
export const MOCK_ACCOUNT_EMAIL = 'elif@ornek.com';
export const MOCK_ACCOUNT_PASSWORD = 'agac12345';

const ELIF: AuthUser = { id: 'mock-user-elif', email: MOCK_ACCOUNT_EMAIL, name: 'Elif' };

export type MockAuthOptions = {
  /** Açılışta oturum açık mı. Varsayılan: kapalı (karşılama ekranı). */
  signedIn?: boolean;
  /** true ise her çağrı `network` hatasıyla reddedilir. */
  fail?: boolean;
  /** Her çağrıya eklenen yapay gecikme (ms). */
  latencyMs?: number;
  /** Google akışının sonucu. Varsayılan: oturum açılır. */
  googleResult?: GoogleSignInResult;
  /** true ise kayıt "e-posta onayı gerekli" döner ve oturum açmaz. */
  requireEmailConfirmation?: boolean;
};

/**
 * Mock bağlantı kodları: `completeAuthLink` için `...?code=recovery-*` şifre sıfırlama, `code=confirm-*` e-posta onayı sayılır;
 * başka kod geçersiz/süresi dolmuş bağlantıdır.
 */
export const MOCK_LINK_PATH = 'auth-callback';

/** Testlerde süre dolmasını taklit etmek için ek yetenek; gerçek arayüzün parçası değildir. */
export type MockAuthService = AuthService & { expireSession(): void };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Bellekte oturum tutan sahte oturum servisi. Her çağrıda taze durumla başlar. */
export function createMockAuthService(options: MockAuthOptions = {}): MockAuthService {
  const { fail = false, latencyMs = 0, googleResult = 'signedIn', requireEmailConfirmation = false } = options;
  const accounts = new Map<string, MockAccount>([
    [ELIF.email, { user: ELIF, password: MOCK_ACCOUNT_PASSWORD }],
  ]);
  const listeners = new Set<(session: AuthSession | null, event: AuthEvent) => void>();
  let session: AuthSession | null = options.signedIn ? { user: ELIF } : null;

  const setSession = (next: AuthSession | null, event: AuthEvent = next ? 'signedIn' : 'signedOut') => {
    session = next;
    listeners.forEach((listener) => listener(next, event));
  };

  const gate = async () => {
    if (latencyMs > 0) await new Promise<void>((resolve) => setTimeout(resolve, latencyMs));
    if (fail) throw new ServiceError('network', authTr.errors.network);
  };

  return {
    getSession: async () => {
      await gate();
      return session;
    },
    onAuthStateChange: (callback) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    signUpWithEmail: async ({ name, email, password }): Promise<SignUpResult> => {
      await gate();
      const key = normalizeEmail(email);
      if (!EMAIL_PATTERN.test(key)) throw new ServiceError('invalid', authTr.errors.emailInvalid);
      if (password.length < MOCK_PASSWORD_MIN_LENGTH) throw new ServiceError('invalid', authTr.errors.weakPassword);
      if (accounts.has(key)) throw new ServiceError('invalid', authTr.errors.emailTaken);
      const user: AuthUser = { id: `mock-user-${accounts.size + 1}`, email: key, name: name.trim() };
      accounts.set(key, { user, password });
      if (requireEmailConfirmation) return { status: 'confirmationRequired' };
      setSession({ user });
      return { status: 'signedIn' };
    },
    signInWithEmail: async ({ email, password }) => {
      await gate();
      const account = accounts.get(normalizeEmail(email));
      if (!account || account.password !== password) {
        throw new ServiceError('invalid', authTr.errors.invalidCredentials);
      }
      const next: AuthSession = { user: account.user };
      setSession(next);
      return next;
    },
    signInWithGoogle: async () => {
      await gate();
      if (googleResult === 'cancelled') return 'cancelled';
      setSession({ user: { id: 'mock-user-google', email: 'defne@ornek.com', name: 'Defne' } });
      return 'signedIn';
    },
    sendPasswordReset: async (email) => {
      await gate();
      if (!EMAIL_PATTERN.test(normalizeEmail(email))) throw new ServiceError('invalid', authTr.errors.emailInvalid);
    },
    signOut: async () => {
      await gate();
      setSession(null);
    },
    completeAuthLink: async (url): Promise<AuthLinkResult> => {
      await gate();
      if (!url.includes(MOCK_LINK_PATH)) return 'ignored';
      const code = /[?&]code=([^&#]+)/.exec(url)?.[1];
      if (!code) return 'ignored';
      if (code.startsWith('recovery')) {
        setSession({ user: ELIF }, 'passwordRecovery');
        return 'handled';
      }
      if (code.startsWith('confirm')) {
        setSession({ user: ELIF });
        return 'handled';
      }
      throw new ServiceError('invalid', authTr.errors.linkInvalid);
    },
    updatePassword: async (newPassword) => {
      await gate();
      if (!session) throw new ServiceError('unauthenticated', authTr.errors.unauthenticated);
      if (newPassword.length < MOCK_PASSWORD_MIN_LENGTH) throw new ServiceError('invalid', authTr.errors.weakPassword);
      const account = accounts.get(session.user.email);
      if (account) {
        if (account.password === newPassword) throw new ServiceError('invalid', authTr.errors.samePassword);
        account.password = newPassword;
      }
    },
    expireSession: () => setSession(null),
  };
}

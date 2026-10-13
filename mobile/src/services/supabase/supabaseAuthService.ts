import type { Session, SupabaseClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { authTr } from '@/i18n/auth';
import type { AuthEvent, AuthSession, GoogleSignInResult } from '@/types';

import type { AuthService } from '../AuthService';
import { ServiceError } from '../errors';
import { createAuthStorage } from './authStorage';
import { mapAuthError } from './authErrors';
import { matchesRedirect, parseAuthCallback } from './oauthCallback';
import { AUTH_STORAGE_KEY, supabase } from './supabaseClient';

/** Google dönüşünün geleceği uygulama adresi (fourtree://auth-callback). Supabase'in izin listesine eklenmeli. */
const REDIRECT_PATH = 'auth-callback';

// Web'de açılan Google penceresini, dönüş sayfası yüklenince kapatır (native'de etkisizdir).
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  WebBrowser.maybeCompleteAuthSession();
}

/**
 * Oturum okuması bu sürede dönmezse (yavaş/kopuk ağda token yenileme takılır) depodaki oturumla devam edilir.
 * AuthProvider'ın kendi zaman aşımından (8 sn) kısadır: ekran karşılamaya düşüp geri dönmez (titreme yok).
 */
export const SESSION_READ_TIMEOUT_MS = 6000;
const TIMED_OUT = Symbol('timed-out');
/** İşlenmiş kodların hatırlandığı üst sınır: bir kod iki kez değiştirilmesin (Android'de dönüş iki yoldan gelir). */
const USED_CODES_LIMIT = 20;

type OpenAuthSession = (url: string, redirectUrl: string) => Promise<{ type: string; url?: string }>;

export type SupabaseAuthDeps = {
  openAuthSession?: OpenAuthSession;
  createRedirectUrl?: () => string;
  /** Ağ yokken kullanılan, depodaki (süresi dolmuş olabilir) oturum. Varsayılan: oturum deposundan okur. */
  readStoredSession?: () => Promise<AuthSession | null>;
  sessionTimeoutMs?: number;
};

export async function readStoredSessionFromStorage(): Promise<AuthSession | null> {
  const raw = await createAuthStorage().getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Session> | null;
    return parsed?.user && typeof parsed.user.id === 'string' ? toAuthSession(parsed as Session) : null;
  } catch {
    return null;
  }
}

function raceTimeout<T>(promise: Promise<T>, ms: number): Promise<T | typeof TIMED_OUT> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(TIMED_OUT), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

const EVENTS: Record<string, AuthEvent> = {
  INITIAL_SESSION: 'initial',
  SIGNED_IN: 'signedIn',
  SIGNED_OUT: 'signedOut',
  PASSWORD_RECOVERY: 'passwordRecovery',
};

function readName(session: Session): string {
  const meta = session.user.user_metadata as Record<string, unknown> | null | undefined;
  const fromMeta = [meta?.full_name, meta?.name].find((v): v is string => typeof v === 'string' && v.trim() !== '');
  return fromMeta?.trim() ?? session.user.email?.split('@')[0] ?? '';
}

/** Token'lar arayüze çıkmaz; yalnız kullanıcı özeti taşınır. */
function toAuthSession(session: Session | null): AuthSession | null {
  if (!session) return null;
  return { user: { id: session.user.id, email: session.user.email ?? '', name: readName(session) } };
}

export function createSupabaseAuthService(
  client: SupabaseClient = supabase,
  {
    openAuthSession = (url, redirectUrl) => WebBrowser.openAuthSessionAsync(url, redirectUrl),
    createRedirectUrl = () => Linking.createURL(REDIRECT_PATH),
    readStoredSession = readStoredSessionFromStorage,
    sessionTimeoutMs = SESSION_READ_TIMEOUT_MS,
  }: SupabaseAuthDeps = {},
): AuthService {
  let googleInFlight: Promise<GoogleSignInResult> | null = null;
  const usedCodes = new Set<string>();
  const markCodeUsed = (code: string): boolean => {
    if (usedCodes.has(code)) return false;
    if (usedCodes.size >= USED_CODES_LIMIT) usedCodes.clear();
    usedCodes.add(code);
    return true;
  };

  const storedSessionOrNull = async (): Promise<AuthSession | null> => {
    try {
      return await readStoredSession();
    } catch {
      return null;
    }
  };

  async function runGoogle(): Promise<GoogleSignInResult> {
    try {
      const redirectTo = createRedirectUrl();
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data.url) throw new ServiceError('invalid', authTr.errors.googleFailed);

      const result = await openAuthSession(data.url, redirectTo);
      // Pencere kapatıldı, iptal edildi ya da başka bir oturum açık: sessizce dön.
      if (result.type !== 'success' || !result.url) return 'cancelled';
      // Dönüş adresi bizim verdiğimiz yönlendirmeyle aynı şema+yol değilse başka bir uygulamanın/sitenin
      // adresidir: içindeki kod ya da hata işlenmez.
      if (!matchesRedirect(result.url, redirectTo)) throw new ServiceError('invalid', authTr.errors.googleFailed);

      const callback = parseAuthCallback(result.url);
      if (callback.kind === 'cancelled') return 'cancelled';
      if (callback.kind !== 'code') throw new ServiceError('invalid', authTr.errors.googleFailed);
      markCodeUsed(callback.code);
      // Saklı code_verifier ile kod oturuma çevrilir (PKCE).
      const { error: exchangeError } = await client.auth.exchangeCodeForSession(callback.code);
      if (exchangeError) throw exchangeError;
      return 'signedIn';
    } catch (error) {
      throw mapAuthError(error, authTr.errors.googleFailed);
    }
  }

  return {
    getSession: async () => {
      try {
        const result = await raceTimeout(client.auth.getSession(), sessionTimeoutMs);
        if (result === TIMED_OUT) return storedSessionOrNull();
        if (!result.error) return toAuthSession(result.data.session);
        // Ağ hatası "oturum yok" değildir: depodaki oturum silinmemiştir, yalnız yenilenememiştir.
        return mapAuthError(result.error).code === 'network' ? storedSessionOrNull() : null;
      } catch (error) {
        return mapAuthError(error).code === 'network' ? storedSessionOrNull() : null;
      }
    },

    onAuthStateChange: (callback) => {
      const { data } = client.auth.onAuthStateChange((event, session) =>
        callback(toAuthSession(session), EVENTS[event] ?? 'other'),
      );
      return () => data.subscription.unsubscribe();
    },

    signUpWithEmail: async ({ name, email, password }) => {
      try {
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password,
          // handle_new_user tetikleyicisi display_name'i raw_user_meta_data->>'full_name' alanından alır.
          options: { data: { full_name: name.trim() }, emailRedirectTo: createRedirectUrl() },
        });
        if (error) throw error;
        // E-posta onayı açıkken kayıtlı adres için hata yerine boş `identities` listeli kullanıcı döner.
        if (data.user?.identities && data.user.identities.length === 0) {
          throw new ServiceError('invalid', authTr.errors.emailTaken);
        }
        return data.session ? { status: 'signedIn' } : { status: 'confirmationRequired' };
      } catch (error) {
        throw mapAuthError(error);
      }
    },

    signInWithEmail: async ({ email, password }) => {
      try {
        const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        const session = toAuthSession(data.session);
        if (!session) throw new ServiceError('invalid', authTr.errors.generic);
        return session;
      } catch (error) {
        throw mapAuthError(error);
      }
    },

    signInWithGoogle: () => {
      // Çift dokunuş aynı akışa katılır: tek OAuth isteği, tek tarayıcı penceresi.
      if (googleInFlight) return googleInFlight;
      const run = runGoogle();
      const clear = () => {
        googleInFlight = null;
      };
      googleInFlight = run;
      run.then(clear, clear);
      return run;
    },

    sendPasswordReset: async (email) => {
      try {
        const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: createRedirectUrl() });
        if (error) throw error;
      } catch (error) {
        throw mapAuthError(error);
      }
    },

    signOut: async () => {
      try {
        // Yalnız bu cihaz: varsayılan 'global' kapsam kullanıcının diğer cihazlarını da düşürürdü.
        const { error } = await client.auth.signOut({ scope: 'local' });
        if (error) throw error;
      } catch (error) {
        const mapped = mapAuthError(error);
        // Zaten oturum yoksa çıkış başarılı sayılır.
        if (mapped.code !== 'unauthenticated') throw mapped;
      }
    },

    completeAuthLink: async (url) => {
      // Google akışı kendi dönüşünü işler (Android'de aynı adres bu yoldan da gelir).
      if (googleInFlight) return 'ignored';
      if (!matchesRedirect(url, createRedirectUrl())) return 'ignored';
      const callback = parseAuthCallback(url);
      if (callback.kind === 'empty') return 'ignored';
      if (callback.kind !== 'code') throw new ServiceError('invalid', authTr.errors.linkInvalid);
      if (!markCodeUsed(callback.code)) return 'ignored';
      try {
        // Onay bağlantısı oturum açar; sıfırlama bağlantısı ayrıca PASSWORD_RECOVERY olayı yayar.
        const { error } = await client.auth.exchangeCodeForSession(callback.code);
        if (error) throw error;
        return 'handled';
      } catch (error) {
        throw mapAuthError(error, authTr.errors.linkInvalid);
      }
    },

    updatePassword: async (newPassword) => {
      try {
        const { error } = await client.auth.updateUser({ password: newPassword });
        if (error) throw error;
      } catch (error) {
        throw mapAuthError(error);
      }
    },
  };
}

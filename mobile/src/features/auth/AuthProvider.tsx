import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { clearActivityLocalData } from '@/features/activity/clearActivityLocalData';
import { useServices } from '@/services';
import type { AuthEvent, AuthSession, AuthStatus } from '@/types';

/** Oturum bu sürede yüklenmezse (yavaş ağ) karşılama gösterilir; sonradan gelen oturum yine uygulanır. */
export const AUTH_LOAD_TIMEOUT_MS = 8000;

type AuthState = {
  status: AuthStatus;
  session: AuthSession | null;
  /** Şifre sıfırlama bağlantısıyla dönüldü: oturum geçici, yeni şifre belirlenene dek uygulamaya girilmez. */
  recovery: boolean;
};

type AuthContextValue = AuthState & {
  /** Hata fırlatabilir (ör. ağ yok); kullanıcıya göstermek için `useSignOut` kullan. */
  signOut: () => Promise<void>;
  /** Yeni şifre kaydedildi: kurtarma modu biter, kullanıcı oturumuyla uygulamaya girer. */
  finishRecovery: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function stateFor(session: AuthSession | null, recovery = false): AuthState {
  return session ? { status: 'signedIn', session, recovery } : { status: 'signedOut', session: null, recovery: false };
}

/**
 * Aynı kullanıcı için (ör. token yenileme) yeni nesne üretmez; gereksiz yeniden çizimi önler.
 * Kurtarma modu yalnız `passwordRecovery` olayıyla başlar; başka olaylar (token yenileme vb.) onu bozmaz,
 * oturum kapanınca biter.
 */
function reduce(prev: AuthState, session: AuthSession | null, event: AuthEvent = 'other'): AuthState {
  const recovery = session ? event === 'passwordRecovery' || prev.recovery : false;
  if (prev.status === 'signedIn' && session && prev.session?.user.id === session.user.id && prev.recovery === recovery) {
    return prev;
  }
  if (prev.status === 'signedOut' && !session) return prev;
  return stateFor(session, recovery);
}

/**
 * Oturum durumunu servisten alır ve uygulamaya dağıtır: 'loading' (kayıtlı oturum aranıyor),
 * 'signedIn', 'signedOut'. Oturum süresi dolar ya da başka yerden kapanırsa dinleyici 'signedOut'a düşürür;
 * oturum açıkken kapanınca cihazdaki koşu taslağı ve bekleyen yükleme kuyruğu silinir
 * (aynı cihaza giren başka hesap önceki kullanıcının rotasını görmesin).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { auth } = useServices();
  const [state, setState] = useState<AuthState>({ status: 'loading', session: null, recovery: false });

  useEffect(() => {
    let listenerFired = false;
    const unsubscribe = auth.onAuthStateChange((session, event) => {
      listenerFired = true;
      setState((prev) => reduce(prev, session, event));
    });
    auth
      .getSession()
      .catch(() => null)
      // Dinleyici daha yeni bir durum bildirdiyse eski okuma onu ezmez.
      .then((session) => {
        if (!listenerFired) setState((prev) => reduce(prev, session));
      });
    const timer = setTimeout(() => {
      setState((prev) => (prev.status === 'loading' ? stateFor(null) : prev));
    }, AUTH_LOAD_TIMEOUT_MS);
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [auth]);

  // Oturum açıkken kapanış (çıkış, süre dolması, başka yerden çıkış): yerel aktivite verisi silinir.
  // Açılışta 'loading' > 'signedOut' geçişi silmez: o kullanıcı zaten oturumsuzdu.
  const previousStatus = useRef<AuthStatus>(state.status);
  useEffect(() => {
    if (previousStatus.current === 'signedIn' && state.status === 'signedOut') {
      clearActivityLocalData().catch(() => {});
    }
    previousStatus.current = state.status;
  }, [state.status]);

  const signOut = useCallback(() => auth.signOut(), [auth]);
  const finishRecovery = useCallback(() => setState((prev) => (prev.recovery ? { ...prev, recovery: false } : prev)), []);
  const value = useMemo<AuthContextValue>(() => ({ ...state, signOut, finishRecovery }), [state, signOut, finishRecovery]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth, <AuthProvider> içinde kullanılmalı.');
  return value;
}

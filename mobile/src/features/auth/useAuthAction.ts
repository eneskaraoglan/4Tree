import { useCallback, useEffect, useRef, useState } from 'react';

import { authTr } from '@/i18n/auth';
import { ServiceError, type ServiceErrorCode } from '@/services';

export type ActionError = { code: ServiceErrorCode | 'unknown'; message: string };

export function toActionError(error: unknown): ActionError {
  if (error instanceof ServiceError) return { code: error.code, message: error.message };
  return { code: 'unknown', message: authTr.errors.generic };
}

/**
 * Bir servis çağrısını (giriş, kayıt, Google, sıfırlama) çalıştırır: yüklenme durumu, çift gönderim engeli ve
 * kullanıcıya gösterilecek hata. `name` hangi eylemin çalıştığını söyler (buton etiketi için).
 */
export function useAuthAction<Name extends string>() {
  const [pending, setPending] = useState<Name | null>(null);
  const [error, setError] = useState<ActionError | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async <T,>(name: Name, action: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false }> => {
    if (busy.current) return { ok: false };
    busy.current = true;
    setPending(name);
    setError(null);
    try {
      const value = await action();
      return { ok: true, value };
    } catch (caught) {
      if (mounted.current) setError(toActionError(caught));
      return { ok: false };
    } finally {
      busy.current = false;
      // Başarılı girişte ekran korumalı rota değişimiyle kapanır; kapanmış ekrana durum yazılmaz.
      if (mounted.current) setPending(null);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { pending, error, run, clearError };
}

import { useEffect, useState } from 'react';

import { useServices } from '@/services';

/**
 * Oturumdaki kullanıcının kimliği. `undefined`: henüz okunuyor, `null`: oturum yok.
 * Taslak ve kuyruk girişleri bu kimlikle damgalanır; başka hesabın girişi gösterilmeden silinir.
 */
export function useActivityUserId(): string | null | undefined {
  const { auth } = useServices();
  const [state, setState] = useState<{ auth: typeof auth; id: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const set = (id: string | null) => {
      if (!cancelled) setState({ auth, id });
    };
    const unsubscribe = auth.onAuthStateChange((session) => set(session?.user.id ?? null));
    auth
      .getSession()
      .then((session) => set(session?.user.id ?? null))
      .catch(() => set(null));
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [auth]);

  return state && state.auth === auth ? state.id : undefined;
}

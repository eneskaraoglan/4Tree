import { useCallback } from 'react';

import { authTr } from '@/i18n/auth';

import { useAuth } from './AuthProvider';
import { showMessage } from './showMessage';
import { toActionError } from './useAuthAction';

/** Çıkış yapar (başarılıysa `onSignedOut` çağrılır); olmazsa (ör. ağ yok) hatayı kullanıcıya gösterir, fırlatmaz. Çıkış olunca rota koruması (auth)'a döner. */
export function useSignOut(onSignedOut?: () => void): () => void {
  const { signOut } = useAuth();
  return useCallback(() => {
    signOut()
      .then(() => onSignedOut?.())
      .catch((error: unknown) => {
        showMessage(authTr.signOutError.title, toActionError(error).message);
      });
  }, [signOut, onSignedOut]);
}

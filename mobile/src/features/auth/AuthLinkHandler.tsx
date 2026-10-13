import * as Linking from 'expo-linking';
import { useEffect } from 'react';

import { authTr } from '@/i18n/auth';
import { useServices } from '@/services';

import { showMessage } from './showMessage';
import { toActionError } from './useAuthAction';

/**
 * Uygulamaya dönen bağlantıları (e-posta onayı, şifre sıfırlama: fourtree://auth-callback?code=...) servise iletir.
 * Hem soğuk açılıştaki ilk adresi hem uygulama açıkken gelenleri dinler. Servis kendine ait olmayan adresi yok sayar.
 * Sonuç oturum olaylarıyla gelir (AuthProvider); burada yalnız geçersiz/süresi dolmuş bağlantı bildirilir.
 */
export function AuthLinkHandler() {
  const { auth } = useServices();

  useEffect(() => {
    const seen = new Set<string>();
    const handle = (url: string | null) => {
      if (!url || seen.has(url)) return;
      seen.add(url);
      auth.completeAuthLink(url).catch((error: unknown) => {
        showMessage(authTr.link.errorTitle, toActionError(error).message);
      });
    };
    Linking.getInitialURL()
      .then(handle)
      .catch(() => {});
    const subscription = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => subscription.remove();
  }, [auth]);

  return null;
}

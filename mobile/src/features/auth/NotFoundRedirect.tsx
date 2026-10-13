import { Redirect, type Href } from 'expo-router';

import { useAuth } from './AuthProvider';

/**
 * Bilinmeyen adres (eski/bozuk derin bağlantı): oturum açıksa ana sekmelere, değilse karşılamaya gider.
 * Oturum yüklenirken bir şey çizmez (splash zaten açık).
 */
export function NotFoundRedirect() {
  const { status } = useAuth();
  if (status === 'loading') return null;
  return <Redirect href={(status === 'signedIn' ? '/' : '/welcome') as Href} />;
}

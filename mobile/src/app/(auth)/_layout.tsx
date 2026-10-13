import { Redirect, Stack, usePathname, type Href } from 'expo-router';

import { useAuth } from '@/features/auth';
import { colors } from '@/theme';

/** Doğrudan /login gibi bir adrese gelinse de altında karşılama olsun (geri düğmesi çalışsın). */
export const unstable_settings = { anchor: 'welcome' };

/** Oturum yokken görünen akış: karşılama, giriş, kayıt, şifre sıfırlama (+ sıfırlama dönüşünde yeni şifre). */
export default function AuthLayout() {
  const { recovery } = useAuth();
  const pathname = usePathname();
  // Sıfırlama bağlantısıyla dönen kullanıcı yeni şifre belirlemeden başka ekrana geçemez.
  if (recovery && pathname !== '/reset-password') return <Redirect href={'/reset-password' as Href} />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} />;
}

import { useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';

/**
 * Typed routes tipleri `expo start` ile üretilir (.expo/types, git dışı); yeni (auth) rotaları oluşana dek
 * derleyici bu adresleri tanımaz. Bu yüzden adresler tek yerde `Href`'e çevrilir.
 */
const href = (path: '/welcome' | '/login' | '/register' | '/forgot-password') => path as Href;

/** (auth) grubundaki ekranlar arası geçişler. Ekranlar router'ı bilmez; rota dosyaları bunu bağlar. */
export function useAuthNavigation() {
  const router = useRouter();
  return useMemo(
    () => ({
      goBack: () => (router.canGoBack() ? router.back() : router.replace(href('/welcome'))),
      /** Yığını sıfırlayıp karşılamaya geçer (ör. yeni şifre ekranından vazgeçince). */
      toWelcome: () => router.replace(href('/welcome')),
      toLogin: () => router.push(href('/login')),
      toRegister: () => router.push(href('/register')),
      toForgotPassword: () => router.push(href('/forgot-password')),
      /** Giriş ve kayıt arasında gidip gelirken yığın büyümesin. */
      switchToLogin: () => router.replace(href('/login')),
      switchToRegister: () => router.replace(href('/register')),
      /** Sıfırlama bağlantısı gönderildikten sonra: yığındaki giriş ekranına dön, yoksa aç. */
      backToLogin: () => router.dismissTo(href('/login')),
    }),
    [router],
  );
}

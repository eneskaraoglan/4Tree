import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthLinkHandler, AuthProvider, useAuth } from '@/features/auth';
import { colors, fontFamily } from '@/theme';
import { useAppFonts } from '@/theme/useAppFonts';

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.canvas,
    card: colors.canvas,
    text: colors.text,
    border: colors.divider,
    notification: colors.primary,
  },
  fonts: {
    regular: { fontFamily: fontFamily.regular, fontWeight: '400' as const },
    medium: { fontFamily: fontFamily.medium, fontWeight: '500' as const },
    bold: { fontFamily: fontFamily.semiBold, fontWeight: '600' as const },
    heavy: { fontFamily: fontFamily.displayExtraBold, fontWeight: '800' as const },
  },
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthLinkHandler />
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { status, recovery } = useAuth();
  // Fontlar ve kayıtlı oturum gelene (ya da hata/zaman aşımına) dek splash açık kalır.
  const ready = useAppFonts(status === 'loading');

  if (!ready || status === 'loading') return null;

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
        {/* Oturum açıkken sekmeler (ve ileride eklenecek diğer ekranlar) açılır; kapalıyken yalnız giriş akışı. */}
        <Stack.Protected guard={status === 'signedIn' && !recovery}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="activity" />
          <Stack.Screen name="edit-profile" />
          <Stack.Screen name="post-detail" />
          <Stack.Screen name="user-profile" />
          <Stack.Screen name="friends" />
          <Stack.Screen name="post-composer" />
        </Stack.Protected>
        {/* Şifre sıfırlama dönüşünde oturum geçicidir: (auth) içindeki yeni şifre ekranı açılır, sekmeler değil. */}
        <Stack.Protected guard={status === 'signedOut' || recovery}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

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
  // Fontlar gelene (ya da hata/zaman aşımına) dek splash açık kalır; sonra sistem fontuyla da devam edilir.
  const ready = useAppFonts();

  if (!ready) return null;

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} />
    </ThemeProvider>
  );
}

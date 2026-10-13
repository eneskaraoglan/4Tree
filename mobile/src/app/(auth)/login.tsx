import { LoginScreen, useAuthNavigation } from '@/features/auth';

export default function LoginRoute() {
  const nav = useAuthNavigation();
  return <LoginScreen onBack={nav.goBack} onRegister={nav.switchToRegister} onForgotPassword={nav.toForgotPassword} />;
}

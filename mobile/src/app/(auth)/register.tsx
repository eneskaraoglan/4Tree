import { RegisterScreen, useAuthNavigation } from '@/features/auth';

export default function RegisterRoute() {
  const nav = useAuthNavigation();
  return <RegisterScreen onBack={nav.goBack} onLogin={nav.switchToLogin} />;
}

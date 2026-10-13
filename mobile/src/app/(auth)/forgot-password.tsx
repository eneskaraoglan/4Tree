import { ForgotPasswordScreen, useAuthNavigation } from '@/features/auth';

export default function ForgotPasswordRoute() {
  const nav = useAuthNavigation();
  return <ForgotPasswordScreen onBack={nav.goBack} onBackToLogin={nav.backToLogin} />;
}

import { WelcomeScreen, useAuthNavigation } from '@/features/auth';

export default function WelcomeRoute() {
  const nav = useAuthNavigation();
  return <WelcomeScreen onRegister={nav.toRegister} onLogin={nav.toLogin} />;
}

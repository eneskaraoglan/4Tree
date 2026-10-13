import { ResetPasswordScreen, useAuth, useAuthNavigation, useSignOut } from '@/features/auth';

export default function ResetPasswordRoute() {
  const { finishRecovery } = useAuth();
  const nav = useAuthNavigation();
  // Vazgeçilirse geçici oturum kapanır, sonra karşılamaya dönülür.
  const cancel = useSignOut(nav.toWelcome);
  return <ResetPasswordScreen onDone={finishRecovery} onCancel={cancel} />;
}

import { redirectAuthCallback } from '@/features/auth/nativeIntent';

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return redirectAuthCallback(path);
}

import { authTr } from '@/i18n/auth';
import type { AuthSession } from '@/types';

import { createMockServices } from '.';
import { createMockAuthService, MOCK_ACCOUNT_EMAIL, MOCK_ACCOUNT_PASSWORD } from './mockAuthService';

describe('mockAuthService', () => {
  it('varsayılan olarak oturumsuz başlar; signedIn seçeneğiyle Elif açık gelir', async () => {
    expect(await createMockAuthService().getSession()).toBeNull();
    const session = await createMockAuthService({ signedIn: true }).getSession();
    expect(session?.user.name).toBe('Elif');
  });

  it('doğru bilgilerle giriş yapar ve dinleyicilere bildirir; yanlış şifre invalid', async () => {
    const auth = createMockAuthService();
    const seen: (AuthSession | null)[] = [];
    auth.onAuthStateChange((s) => seen.push(s));

    await expect(auth.signInWithEmail({ email: MOCK_ACCOUNT_EMAIL, password: 'yanlis-sifre' })).rejects.toMatchObject({
      code: 'invalid',
      message: authTr.errors.invalidCredentials,
    });
    expect(seen).toHaveLength(0);

    const session = await auth.signInWithEmail({ email: ` ${MOCK_ACCOUNT_EMAIL.toUpperCase()} `, password: MOCK_ACCOUNT_PASSWORD });
    expect(session.user.email).toBe(MOCK_ACCOUNT_EMAIL);
    expect(seen).toEqual([session]);
    expect(await auth.getSession()).toEqual(session);
  });

  it('kayıt yeni hesap açar ve oturumu başlatır; aynı e-posta ikinci kez kayıt olamaz', async () => {
    const auth = createMockAuthService();
    const result = await auth.signUpWithEmail({ name: 'Mert', email: 'mert@ornek.com', password: 'agac12345' });
    expect(result).toEqual({ status: 'signedIn' });
    expect((await auth.getSession())?.user.name).toBe('Mert');

    await auth.signOut();
    await expect(auth.signUpWithEmail({ name: 'Mert', email: 'mert@ornek.com', password: 'agac12345' })).rejects.toMatchObject({
      code: 'invalid',
      message: authTr.errors.emailTaken,
    });
    // Kayıtla açılan hesapla sonra giriş yapılabilir.
    await expect(auth.signInWithEmail({ email: 'mert@ornek.com', password: 'agac12345' })).resolves.toBeTruthy();
  });

  it('kısa şifre ve geçersiz e-posta reddedilir; onay gerekirse oturum açılmaz', async () => {
    const auth = createMockAuthService({ requireEmailConfirmation: true });
    await expect(auth.signUpWithEmail({ name: 'Z', email: 'z@ornek.com', password: 'kisa' })).rejects.toMatchObject({
      message: authTr.errors.weakPassword,
    });
    await expect(auth.signUpWithEmail({ name: 'Z', email: 'z-yok', password: 'agac12345' })).rejects.toMatchObject({
      message: authTr.errors.emailInvalid,
    });
    expect(await auth.signUpWithEmail({ name: 'Z', email: 'z@ornek.com', password: 'agac12345' })).toEqual({
      status: 'confirmationRequired',
    });
    expect(await auth.getSession()).toBeNull();
  });

  it('Google: varsayılan oturum açar, cancelled seçeneğinde oturum açmaz', async () => {
    const ok = createMockAuthService();
    expect(await ok.signInWithGoogle()).toBe('signedIn');
    expect(await ok.getSession()).not.toBeNull();

    const cancelled = createMockAuthService({ googleResult: 'cancelled' });
    expect(await cancelled.signInWithGoogle()).toBe('cancelled');
    expect(await cancelled.getSession()).toBeNull();
  });

  it('signOut ve expireSession dinleyicilere null bildirir; abonelik bırakılabilir', async () => {
    const auth = createMockAuthService({ signedIn: true });
    const callback = jest.fn();
    const stop = auth.onAuthStateChange(callback);

    await auth.signOut();
    expect(callback).toHaveBeenLastCalledWith(null, 'signedOut');

    await auth.signInWithEmail({ email: MOCK_ACCOUNT_EMAIL, password: MOCK_ACCOUNT_PASSWORD });
    auth.expireSession();
    expect(callback).toHaveBeenLastCalledWith(null, 'signedOut');

    stop();
    callback.mockClear();
    auth.expireSession();
    expect(callback).not.toHaveBeenCalled();
  });

  it('sendPasswordReset geçerli e-postada sessizce biter, geçersizde invalid', async () => {
    const auth = createMockAuthService();
    await expect(auth.sendPasswordReset('kimse@ornek.com')).resolves.toBeUndefined();
    await expect(auth.sendPasswordReset('bozuk')).rejects.toMatchObject({ code: 'invalid' });
  });

  it('error senaryosunda tüm çağrılar network hatası verir; latencyMs gecikme ekler', async () => {
    const failing = createMockServices({ scenario: 'error' }).auth;
    await expect(failing.getSession()).rejects.toMatchObject({ code: 'network' });
    await expect(failing.signInWithEmail({ email: MOCK_ACCOUNT_EMAIL, password: MOCK_ACCOUNT_PASSWORD })).rejects.toMatchObject({
      code: 'network',
    });

    jest.useFakeTimers();
    try {
      const slow = createMockServices({ latencyMs: 300 }).auth;
      let settled = false;
      const pending = slow.getSession().then(() => {
        settled = true;
      });
      await jest.advanceTimersByTimeAsync(299);
      expect(settled).toBe(false);
      await jest.advanceTimersByTimeAsync(1);
      await pending;
      expect(settled).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('createMockServices her çağrıda ayrı oturum durumu üretir', async () => {
    const a = createMockServices({ signedIn: true });
    const b = createMockServices();
    expect(await a.auth.getSession()).not.toBeNull();
    expect(await b.auth.getSession()).toBeNull();
  });

  it('olaylar: giriş signedIn, çıkış signedOut olarak bildirilir', async () => {
    const auth = createMockAuthService();
    const events: string[] = [];
    auth.onAuthStateChange((_s, event) => events.push(event));
    await auth.signInWithEmail({ email: MOCK_ACCOUNT_EMAIL, password: MOCK_ACCOUNT_PASSWORD });
    await auth.signOut();
    expect(events).toEqual(['signedIn', 'signedOut']);
  });

  it('şifre sıfırlama bağlantısı oturum açar ve passwordRecovery olayı yayar', async () => {
    const auth = createMockAuthService();
    const seen: [AuthSession | null, string][] = [];
    auth.onAuthStateChange((s, e) => seen.push([s, e]));

    await expect(auth.completeAuthLink('fourtree://auth-callback?code=recovery-1')).resolves.toBe('handled');
    expect(seen).toHaveLength(1);
    expect(seen[0][1]).toBe('passwordRecovery');
    expect(seen[0][0]?.user.email).toBe(MOCK_ACCOUNT_EMAIL);
  });

  it('e-posta onay bağlantısı oturum açar; geçersiz kod invalid, yabancı adres ignored', async () => {
    const auth = createMockAuthService();
    await expect(auth.completeAuthLink('fourtree://auth-callback?code=confirm-1')).resolves.toBe('handled');
    expect(await auth.getSession()).not.toBeNull();
    await expect(auth.completeAuthLink('fourtree://auth-callback?code=eski')).rejects.toMatchObject({
      code: 'invalid',
      message: authTr.errors.linkInvalid,
    });
    await expect(auth.completeAuthLink('https://baska.example/x?code=confirm-1')).resolves.toBe('ignored');
    await expect(auth.completeAuthLink('fourtree://auth-callback')).resolves.toBe('ignored');
  });

  it('updatePassword: oturum gerekir, kısa/aynı şifre reddedilir, yenisiyle giriş yapılır', async () => {
    const auth = createMockAuthService();
    await expect(auth.updatePassword('yeni-sifre-1')).rejects.toMatchObject({ code: 'unauthenticated' });

    await auth.completeAuthLink('fourtree://auth-callback?code=recovery-1');
    await expect(auth.updatePassword('kisa')).rejects.toMatchObject({ message: authTr.errors.weakPassword });
    await expect(auth.updatePassword(MOCK_ACCOUNT_PASSWORD)).rejects.toMatchObject({ message: authTr.errors.samePassword });
    await auth.updatePassword('yeni-sifre-1');
    await auth.signOut();
    await expect(auth.signInWithEmail({ email: MOCK_ACCOUNT_EMAIL, password: MOCK_ACCOUNT_PASSWORD })).rejects.toBeTruthy();
    await expect(auth.signInWithEmail({ email: MOCK_ACCOUNT_EMAIL, password: 'yeni-sifre-1' })).resolves.toBeTruthy();
  });
});

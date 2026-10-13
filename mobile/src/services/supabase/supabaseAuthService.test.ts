import type { SupabaseClient } from '@supabase/supabase-js';

import { authTr } from '@/i18n/auth';

import { ServiceError } from '../errors';
import { createSupabaseAuthService } from './supabaseAuthService';

jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn(), openAuthSessionAsync: jest.fn() }));
jest.mock('expo-linking', () => ({ createURL: jest.fn((path: string) => `fourtree://${path}`) }));

const REDIRECT = 'fourtree://auth-callback';

type Result = { data: Record<string, unknown>; error: unknown };
const ok = (data: Record<string, unknown> = {}): Result => ({ data, error: null });
const fail = (error: unknown): Result => ({ data: {}, error });

const supabaseSession = {
  user: { id: 'u1', email: 'elif@ornek.com', user_metadata: { full_name: 'Elif Yıldız' } },
};

function createFakeClient() {
  const unsubscribe = jest.fn();
  const auth = {
    getSession: jest.fn(async (): Promise<Result> => ok({ session: null })),
    onAuthStateChange: jest.fn((_cb: (event: string, session: unknown) => void) => ({
      data: { subscription: { unsubscribe } },
    })),
    signUp: jest.fn(async (_args: unknown): Promise<Result> => ok({ user: { identities: [{}] }, session: null })),
    signInWithPassword: jest.fn(async (_args: unknown): Promise<Result> => ok({ session: supabaseSession })),
    signInWithOAuth: jest.fn(async (_args: unknown): Promise<Result> => ok({ url: 'https://google.example/oauth' })),
    setSession: jest.fn(async (_args: unknown): Promise<Result> => ok({ session: supabaseSession })),
    updateUser: jest.fn(async (_args: unknown): Promise<Result> => ok({ user: supabaseSession.user })),
    exchangeCodeForSession: jest.fn(async (_code: string): Promise<Result> => ok({ session: supabaseSession })),
    resetPasswordForEmail: jest.fn(async (_email: string): Promise<Result> => ok({})),
    signOut: jest.fn(async (_args: unknown): Promise<{ error: unknown }> => ({ error: null })),
  };
  return { client: { auth } as unknown as SupabaseClient, auth, unsubscribe };
}

const STORED_SESSION = { user: { id: 'u1', email: 'elif@ornek.com', name: 'Elif Yıldız' } };

function setup(sessionResult?: { type: string; url?: string }, extra: Parameters<typeof createSupabaseAuthService>[1] = {}) {
  const fake = createFakeClient();
  const openAuthSession = jest.fn(async (_url: string, _redirect: string) => sessionResult ?? { type: 'cancel' });
  const readStoredSession = jest.fn(async () => STORED_SESSION);
  const service = createSupabaseAuthService(fake.client, {
    openAuthSession,
    createRedirectUrl: () => REDIRECT,
    readStoredSession,
    ...extra,
  });
  return { ...fake, service, openAuthSession, readStoredSession };
}

describe('supabaseAuthService oturum', () => {
  it('getSession yalnız kullanıcı özetini döner (token yok); hata olursa null', async () => {
    const { service, auth } = setup();
    auth.getSession.mockResolvedValueOnce(ok({ session: { ...supabaseSession, access_token: 'GIZLI' } }));
    const session = await service.getSession();
    expect(session).toEqual({ user: { id: 'u1', email: 'elif@ornek.com', name: 'Elif Yıldız' } });
    expect(JSON.stringify(session)).not.toContain('GIZLI');

    auth.getSession.mockRejectedValueOnce(new Error('depo okunamadı'));
    expect(await service.getSession()).toBeNull();
  });

  it('adı yoksa e-postanın @ öncesini kullanır', async () => {
    const { service, auth } = setup();
    auth.getSession.mockResolvedValueOnce(ok({ session: { user: { id: 'u2', email: 'can@ornek.com', user_metadata: {} } } }));
    expect((await service.getSession())?.user.name).toBe('can');
  });

  it('onAuthStateChange olayları arayüz oturumuna çevirir ve abonelikten çıkar', () => {
    const { service, auth, unsubscribe } = setup();
    const callback = jest.fn();
    const stop = service.onAuthStateChange(callback);

    const listener = auth.onAuthStateChange.mock.calls[0][0];
    listener('SIGNED_IN', supabaseSession);
    listener('SIGNED_OUT', null);
    listener('PASSWORD_RECOVERY', supabaseSession);
    listener('TOKEN_REFRESHED', supabaseSession);
    expect(callback).toHaveBeenNthCalledWith(1, STORED_SESSION, 'signedIn');
    expect(callback).toHaveBeenNthCalledWith(2, null, 'signedOut');
    expect(callback).toHaveBeenNthCalledWith(3, STORED_SESSION, 'passwordRecovery');
    expect(callback).toHaveBeenNthCalledWith(4, STORED_SESSION, 'other');

    stop();
    expect(unsubscribe).toHaveBeenCalled();
  });
});

describe('supabaseAuthService e-posta', () => {
  it('kayıtta adı full_name olarak gönderir (handle_new_user tetikleyicisi için)', async () => {
    const { service, auth } = setup();
    await service.signUpWithEmail({ name: ' Elif ', email: ' elif@ornek.com ', password: 'agac12345' });
    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'elif@ornek.com',
      password: 'agac12345',
      options: { data: { full_name: 'Elif' }, emailRedirectTo: REDIRECT },
    });
  });

  it('kayıtta oturum dönerse signedIn, dönmezse confirmationRequired', async () => {
    const { service, auth } = setup();
    expect(await service.signUpWithEmail({ name: 'E', email: 'e@ornek.com', password: 'agac12345' })).toEqual({
      status: 'confirmationRequired',
    });
    auth.signUp.mockResolvedValueOnce(ok({ user: { identities: [{}] }, session: supabaseSession }));
    expect(await service.signUpWithEmail({ name: 'E', email: 'e@ornek.com', password: 'agac12345' })).toEqual({
      status: 'signedIn',
    });
  });

  it('kayıtlı e-postada (boş identities) "zaten kayıtlı" hatası verir', async () => {
    const { service, auth } = setup();
    auth.signUp.mockResolvedValueOnce(ok({ user: { identities: [] }, session: null }));
    await expect(service.signUpWithEmail({ name: 'E', email: 'e@ornek.com', password: 'agac12345' })).rejects.toMatchObject({
      code: 'invalid',
      message: authTr.errors.emailTaken,
    });
  });

  it('yanlış şifrede ham Supabase mesajını değil Türkçe metni fırlatır', async () => {
    const { service, auth } = setup();
    auth.signInWithPassword.mockResolvedValueOnce(
      fail({ name: 'AuthApiError', code: 'invalid_credentials', status: 400, message: 'Invalid login credentials' }),
    );
    const error = await service.signInWithEmail({ email: 'a@b.co', password: 'yanlis123' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ServiceError);
    expect(error).toMatchObject({ code: 'invalid', message: 'E-posta veya şifre hatalı.' });
  });

  it('ağ kopukken signInWithEmail network hatası verir', async () => {
    const { service, auth } = setup();
    auth.signInWithPassword.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(service.signInWithEmail({ email: 'a@b.co', password: 'agac12345' })).rejects.toMatchObject({
      code: 'network',
    });
  });

  it('şifre sıfırlamada e-postayı kırpıp gönderir; hata Türkçeye eşlenir', async () => {
    const { service, auth } = setup();
    await service.sendPasswordReset(' elif@ornek.com ');
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('elif@ornek.com', { redirectTo: REDIRECT });

    auth.resetPasswordForEmail.mockResolvedValueOnce(
      fail({ name: 'AuthApiError', code: 'over_email_send_rate_limit', status: 429, message: 'rate limit' }),
    );
    await expect(service.sendPasswordReset('elif@ornek.com')).rejects.toMatchObject({
      code: 'invalid',
      message: authTr.errors.tooManyRequests,
    });
  });

  it('çıkışta yalnız bu cihazı kapatır; oturum zaten yoksa hata vermez, ağ hatasını iletir', async () => {
    const { service, auth } = setup();
    await service.signOut();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });

    auth.signOut.mockResolvedValueOnce({ error: { name: 'AuthSessionMissingError', message: 'Auth session missing!' } });
    await expect(service.signOut()).resolves.toBeUndefined();

    auth.signOut.mockResolvedValueOnce({ error: { name: 'AuthRetryableFetchError', status: 0, message: 'x' } });
    await expect(service.signOut()).rejects.toMatchObject({ code: 'network' });
  });
});

describe('supabaseAuthService Google', () => {
  it('fourtree:// yönlendirmesi ve skipBrowserRedirect ile OAuth başlatır', async () => {
    const { service, auth, openAuthSession } = setup({ type: 'cancel' });
    await service.signInWithGoogle();
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: REDIRECT, skipBrowserRedirect: true },
    });
    expect(openAuthSession).toHaveBeenCalledWith('https://google.example/oauth', REDIRECT);
  });

  it('kullanıcı pencereyi kapatırsa sessizce cancelled döner ve oturum kurmaz', async () => {
    for (const type of ['cancel', 'dismiss', 'locked']) {
      const { service, auth } = setup({ type });
      await expect(service.signInWithGoogle()).resolves.toBe('cancelled');
      expect(auth.setSession).not.toHaveBeenCalled();
      expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
    }
  });

  it('Google izin ekranında reddedilirse (access_denied) cancelled döner', async () => {
    const { service } = setup({ type: 'success', url: `${REDIRECT}?error=access_denied` });
    await expect(service.signInWithGoogle()).resolves.toBe('cancelled');
  });

  it('doğrudan token taşıyan dönüşü (örtük akış) reddeder: setSession hiç çağrılmaz', async () => {
    const { service, auth } = setup({ type: 'success', url: `${REDIRECT}#access_token=AT&refresh_token=RT` });
    await expect(service.signInWithGoogle()).rejects.toMatchObject({ code: 'invalid', message: authTr.errors.googleFailed });
    expect(auth.setSession).not.toHaveBeenCalled();
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('yabancı bir adrese dönüş (şema/yol uyuşmuyor) kod içerse de işlenmez', async () => {
    for (const url of [
      'https://kotu.example/auth-callback?code=kod123',
      'baskauygulama://auth-callback?code=kod123',
      'fourtree://baska-yol?code=kod123',
    ]) {
      const { service, auth } = setup({ type: 'success', url });
      await expect(service.signInWithGoogle()).rejects.toMatchObject({ code: 'invalid', message: authTr.errors.googleFailed });
      expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
      expect(auth.setSession).not.toHaveBeenCalled();
    }
  });

  it('yabancı adresten gelen access_denied de iptal sayılmaz (önce adres doğrulanır)', async () => {
    const { service } = setup({ type: 'success', url: 'https://kotu.example/x?error=access_denied' });
    await expect(service.signInWithGoogle()).rejects.toMatchObject({ message: authTr.errors.googleFailed });
  });

  it('çift dokunuş aynı akışa katılır: tek OAuth isteği, tek tarayıcı penceresi', async () => {
    const { service, auth, openAuthSession } = setup({ type: 'success', url: `${REDIRECT}?code=kod123` });
    const [a, b] = await Promise.all([service.signInWithGoogle(), service.signInWithGoogle()]);
    expect(a).toBe('signedIn');
    expect(b).toBe('signedIn');
    expect(auth.signInWithOAuth).toHaveBeenCalledTimes(1);
    expect(openAuthSession).toHaveBeenCalledTimes(1);
    expect(auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
    // Akış bitince yeni bir deneme yapılabilir.
    await service.signInWithGoogle();
    expect(auth.signInWithOAuth).toHaveBeenCalledTimes(2);
  });

  it('dönüş adresindeki code ile exchangeCodeForSession çağırır (PKCE)', async () => {
    const { service, auth } = setup({ type: 'success', url: `${REDIRECT}?code=kod123` });
    await expect(service.signInWithGoogle()).resolves.toBe('signedIn');
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('kod123');
  });

  it('boş dönüş ve sunucu hatasında googleFailed (invalid) fırlatır', async () => {
    const empty = setup({ type: 'success', url: REDIRECT });
    await expect(empty.service.signInWithGoogle()).rejects.toMatchObject({
      code: 'invalid',
      message: authTr.errors.googleFailed,
    });

    const broken = setup({ type: 'success', url: `${REDIRECT}?code=kod` });
    broken.auth.exchangeCodeForSession.mockResolvedValueOnce(
      fail({ name: 'AuthApiError', code: 'bad_code_verifier', status: 400, message: 'ham' }),
    );
    await expect(broken.service.signInWithGoogle()).rejects.toMatchObject({ message: authTr.errors.googleFailed });
  });

  it('OAuth başlatılamazsa (ağ yok) network hatası verir ve tarayıcıyı açmaz', async () => {
    const { service, auth, openAuthSession } = setup();
    auth.signInWithOAuth.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(service.signInWithGoogle()).rejects.toMatchObject({ code: 'network' });
    expect(openAuthSession).not.toHaveBeenCalled();
  });
});

describe('supabaseAuthService çevrimdışı açılış', () => {
  const retryable = { name: 'AuthRetryableFetchError', status: 0, message: 'Network request failed' };

  it('ağ hatasında depodaki oturumu "oturum yok" saymaz, onunla döner', async () => {
    const { service, auth, readStoredSession } = setup();
    auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: retryable });
    await expect(service.getSession()).resolves.toEqual(STORED_SESSION);
    expect(readStoredSession).toHaveBeenCalledTimes(1);
  });

  it('ağ hatası fırlatılırsa da depodaki oturumla döner', async () => {
    const { service, auth } = setup();
    auth.getSession.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(service.getSession()).resolves.toEqual(STORED_SESSION);
  });

  it('depoda oturum yoksa ağ hatasında da null döner', async () => {
    const { service, auth, readStoredSession } = setup();
    readStoredSession.mockResolvedValueOnce(null as never);
    auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: retryable });
    await expect(service.getSession()).resolves.toBeNull();
  });

  it('gerçek geçersizlikte (ağ dışı hata) depoya bakmaz: oturum yok', async () => {
    const { service, auth, readStoredSession } = setup();
    auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: { name: 'AuthApiError', code: 'refresh_token_not_found', status: 400, message: 'x' },
    });
    await expect(service.getSession()).resolves.toBeNull();
    expect(readStoredSession).not.toHaveBeenCalled();
  });

  it('okuma takılırsa (yavaş ağ) zaman aşımında depodaki oturumla döner', async () => {
    jest.useFakeTimers();
    try {
      const { service, auth } = setup(undefined, { sessionTimeoutMs: 6000 });
      auth.getSession.mockImplementationOnce(() => new Promise(() => {}));
      const pending = service.getSession();
      await jest.advanceTimersByTimeAsync(6000);
      await expect(pending).resolves.toEqual(STORED_SESSION);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('supabaseAuthService e-posta bağlantıları', () => {
  it('code içeren dönüşü oturuma çevirir (e-posta onayı / şifre sıfırlama)', async () => {
    const { service, auth } = setup();
    await expect(service.completeAuthLink(`${REDIRECT}?code=kod-e-posta`)).resolves.toBe('handled');
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('kod-e-posta');
  });

  it('yabancı adresi, kodsuz adresi ve aynı kodu ikinci kez yok sayar', async () => {
    const { service, auth } = setup();
    await expect(service.completeAuthLink('https://kotu.example/auth-callback?code=k')).resolves.toBe('ignored');
    await expect(service.completeAuthLink(REDIRECT)).resolves.toBe('ignored');
    await expect(service.completeAuthLink(`${REDIRECT}#access_token=AT&refresh_token=RT`)).resolves.toBe('ignored');
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();

    await service.completeAuthLink(`${REDIRECT}?code=bir-kez`);
    await expect(service.completeAuthLink(`${REDIRECT}?code=bir-kez`)).resolves.toBe('ignored');
    expect(auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
  });

  it('süresi dolmuş bağlantı (hata parametresi ya da reddedilen kod) Türkçe invalid hatasıdır', async () => {
    const { service, auth } = setup();
    await expect(service.completeAuthLink(`${REDIRECT}?error=access_denied&error_code=otp_expired`)).rejects.toMatchObject({
      code: 'invalid',
      message: authTr.errors.linkInvalid,
    });
    auth.exchangeCodeForSession.mockResolvedValueOnce(
      fail({ name: 'AuthApiError', code: 'flow_state_not_found', status: 404, message: 'ham' }),
    );
    await expect(service.completeAuthLink(`${REDIRECT}?code=eski`)).rejects.toMatchObject({
      message: authTr.errors.linkInvalid,
    });
  });

  it('Google akışı sürerken aynı dönüşü ikinci kez işlemez (Android çift teslim)', async () => {
    const { service, auth, openAuthSession } = setup({ type: 'success', url: `${REDIRECT}?code=google-kod` });
    let linkResult: unknown;
    openAuthSession.mockImplementationOnce(async () => {
      linkResult = await service.completeAuthLink(`${REDIRECT}?code=google-kod`);
      return { type: 'success', url: `${REDIRECT}?code=google-kod` };
    });
    await service.signInWithGoogle();
    expect(linkResult).toBe('ignored');
    // Akıştan sonra gelen gecikmiş aynı kod da yok sayılır.
    await expect(service.completeAuthLink(`${REDIRECT}?code=google-kod`)).resolves.toBe('ignored');
    expect(auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
  });

  it('updatePassword yeni şifreyi gönderir; oturum yoksa unauthenticated, aynı şifre invalid', async () => {
    const { service, auth } = setup();
    await service.updatePassword('yeni-sifre-1');
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'yeni-sifre-1' });

    auth.updateUser.mockResolvedValueOnce(fail({ name: 'AuthSessionMissingError', message: 'Auth session missing!' }));
    await expect(service.updatePassword('yeni-sifre-1')).rejects.toMatchObject({ code: 'unauthenticated' });

    auth.updateUser.mockResolvedValueOnce(fail({ name: 'AuthApiError', code: 'same_password', status: 422, message: 'x' }));
    await expect(service.updatePassword('eski')).rejects.toMatchObject({ code: 'invalid', message: authTr.errors.samePassword });
  });
});

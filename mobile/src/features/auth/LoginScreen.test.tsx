import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { authTr } from '@/i18n/auth';
import { createMockServices, ServiceError, ServicesProvider, type Services } from '@/services';
import { MOCK_ACCOUNT_EMAIL, MOCK_ACCOUNT_PASSWORD } from '@/services/mock/mockAuthService';

import { LoginScreen } from './LoginScreen';

jest.mock('react-native-reanimated', () =>
  jest.requireActual('@/components/illustration/reanimatedTestMock').createReanimatedMock(),
);
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

const handlers = { onBack: jest.fn(), onRegister: jest.fn(), onForgotPassword: jest.fn() };

async function renderLogin(services: Services = createMockServices()) {
  await render(
    <ServicesProvider services={services}>
      <LoginScreen {...handlers} />
    </ServicesProvider>,
  );
  return services;
}

async function fillForm(email: string, password: string) {
  await fireEvent.changeText(screen.getByLabelText(authTr.fields.email), email);
  await fireEvent.changeText(screen.getByLabelText(authTr.fields.password), password);
}

const submitButton = () => screen.getByRole('button', { name: authTr.login.submit });

describe('LoginScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('başlık, iki alan, giriş, Google ve bağlantıları gösterir', async () => {
    await renderLogin();
    expect(screen.getByRole('header', { name: authTr.login.title })).toBeTruthy();
    expect(screen.getByLabelText(authTr.fields.email)).toBeTruthy();
    expect(screen.getByLabelText(authTr.fields.password)).toBeTruthy();
    expect(submitButton()).toBeTruthy();
    expect(screen.getByRole('button', { name: authTr.google.action })).toBeTruthy();
    expect(screen.getByRole('link', { name: authTr.login.forgot })).toBeTruthy();
    expect(screen.getByRole('link', { name: authTr.login.toRegister })).toBeTruthy();
  });

  it('boş gönderimde satır içi hataları gösterir ve servisi çağırmaz', async () => {
    const services = createMockServices();
    const signIn = jest.spyOn(services.auth, 'signInWithEmail');
    await renderLogin(services);

    await fireEvent.press(submitButton());

    expect(screen.getByText(authTr.validation.emailRequired)).toBeTruthy();
    expect(screen.getByText(authTr.validation.passwordRequired)).toBeTruthy();
    expect(signIn).not.toHaveBeenCalled();
  });

  it('geçersiz e-postayı alandan çıkınca bildirir', async () => {
    await renderLogin();
    const email = screen.getByLabelText(authTr.fields.email);
    await fireEvent.changeText(email, 'ad-ornek');
    await fireEvent(email, 'blur');
    expect(screen.getByText(authTr.validation.emailInvalid)).toBeTruthy();
  });

  it('boş alandan çıkınca zorunlu hatası göstermez (düzen kaymasın)', async () => {
    await renderLogin();
    await fireEvent(screen.getByLabelText(authTr.fields.email), 'blur');
    expect(screen.queryByText(authTr.validation.emailRequired)).toBeNull();
  });

  it('doğru bilgilerle servisi çağırır ve oturum açılır', async () => {
    const services = createMockServices();
    const signIn = jest.spyOn(services.auth, 'signInWithEmail');
    await renderLogin(services);

    await fillForm(` ${MOCK_ACCOUNT_EMAIL} `, MOCK_ACCOUNT_PASSWORD);
    await fireEvent.press(submitButton());

    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(1));
    expect(signIn).toHaveBeenCalledWith({ email: ` ${MOCK_ACCOUNT_EMAIL} `, password: MOCK_ACCOUNT_PASSWORD });
    await waitFor(async () => expect(await services.auth.getSession()).not.toBeNull());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('yanlış şifrede sabit Türkçe hata gösterir', async () => {
    await renderLogin();
    await fillForm(MOCK_ACCOUNT_EMAIL, 'yanlis-sifre');
    await fireEvent.press(submitButton());

    expect(await screen.findByText(authTr.errors.invalidCredentials)).toBeTruthy();
    expect(screen.queryByText(authTr.login.submitting)).toBeNull();
    // Ağ hatası olmadığı için "Tekrar dene" yok.
    expect(screen.queryByRole('link', { name: authTr.retry })).toBeNull();
  });

  it('ağ hatasında "Tekrar dene" gösterir; basınca yeniden dener', async () => {
    const services = createMockServices();
    const signIn = jest
      .spyOn(services.auth, 'signInWithEmail')
      .mockRejectedValueOnce(new ServiceError('network', authTr.errors.network));
    await renderLogin(services);

    await fillForm(MOCK_ACCOUNT_EMAIL, MOCK_ACCOUNT_PASSWORD);
    await fireEvent.press(submitButton());
    expect(await screen.findByText(authTr.errors.network)).toBeTruthy();

    signIn.mockRestore();
    const retrySignIn = jest.spyOn(services.auth, 'signInWithEmail');
    await fireEvent.press(screen.getByRole('link', { name: authTr.retry }));

    await waitFor(() => expect(retrySignIn).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText(authTr.errors.network)).toBeNull());
  });

  it('istek sürerken buton yükleniyor durumuna geçer ve çift gönderimi engeller', async () => {
    const services = createMockServices();
    let resolveSignIn: (value: { user: { id: string; email: string; name: string } }) => void = () => {};
    const signIn = jest.spyOn(services.auth, 'signInWithEmail').mockImplementation(
      () => new Promise((resolve) => (resolveSignIn = resolve)),
    );
    await renderLogin(services);

    await fillForm(MOCK_ACCOUNT_EMAIL, MOCK_ACCOUNT_PASSWORD);
    await fireEvent.press(submitButton());

    const busy = await screen.findByRole('button', { name: authTr.login.submitting });
    expect(busy.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
    // Google da bu sırada kapalı.
    expect(screen.getByRole('button', { name: authTr.google.action }).props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(busy);
    expect(signIn).toHaveBeenCalledTimes(1);

    resolveSignIn({ user: { id: 'u', email: MOCK_ACCOUNT_EMAIL, name: 'Elif' } });
    await waitFor(() => expect(screen.getByRole('button', { name: authTr.login.submit })).toBeTruthy());
  });

  it('şifre göster/gizle düğmesi alanın gizliliğini değiştirir', async () => {
    await renderLogin();
    const password = screen.getByLabelText(authTr.fields.password);
    expect(password.props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: authTr.fields.showPasswordLabel }));
    expect(screen.getByLabelText(authTr.fields.password).props.secureTextEntry).toBe(false);
    await fireEvent.press(screen.getByRole('button', { name: authTr.fields.hidePasswordLabel }));
    expect(screen.getByLabelText(authTr.fields.password).props.secureTextEntry).toBe(true);
  });

  it('klavye sırası: e-posta "next", şifre "go" ve gönderir', async () => {
    const services = createMockServices();
    const signIn = jest.spyOn(services.auth, 'signInWithEmail');
    await renderLogin(services);
    expect(screen.getByLabelText(authTr.fields.email).props.returnKeyType).toBe('next');
    expect(screen.getByLabelText(authTr.fields.password).props.returnKeyType).toBe('go');

    await fillForm(MOCK_ACCOUNT_EMAIL, MOCK_ACCOUNT_PASSWORD);
    await fireEvent(screen.getByLabelText(authTr.fields.password), 'submitEditing');
    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(1));
  });

  it('Google: kullanıcı iptal ederse hata göstermez, düğme eski haline döner', async () => {
    const services = createMockServices();
    const google = jest.spyOn(services.auth, 'signInWithGoogle').mockResolvedValue('cancelled');
    await renderLogin(services);

    await fireEvent.press(screen.getByRole('button', { name: authTr.google.action }));

    await waitFor(() => expect(google).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: authTr.google.action })).toBeTruthy());
    expect(screen.queryByRole('alert')).toBeNull();
    expect(await services.auth.getSession()).toBeNull();
  });

  it('Google: başarısızlıkta sabit hata metnini gösterir', async () => {
    const services = createMockServices();
    jest.spyOn(services.auth, 'signInWithGoogle').mockRejectedValue(new ServiceError('invalid', authTr.errors.googleFailed));
    await renderLogin(services);

    await fireEvent.press(screen.getByRole('button', { name: authTr.google.action }));
    expect(await screen.findByText(authTr.errors.googleFailed)).toBeTruthy();
  });

  it('Google: başarılıysa oturum açılır', async () => {
    const services = createMockServices();
    await renderLogin(services);
    await fireEvent.press(screen.getByRole('button', { name: authTr.google.action }));
    await waitFor(async () => expect(await services.auth.getSession()).not.toBeNull());
  });

  it('bağlantılar ve geri düğmesi üst katmandaki yönlendirmeleri çağırır', async () => {
    await renderLogin();
    await fireEvent.press(screen.getByRole('link', { name: authTr.login.forgot }));
    await fireEvent.press(screen.getByRole('link', { name: authTr.login.toRegister }));
    await fireEvent.press(screen.getByRole('button', { name: authTr.back }));
    expect(handlers.onForgotPassword).toHaveBeenCalledTimes(1);
    expect(handlers.onRegister).toHaveBeenCalledTimes(1);
    expect(handlers.onBack).toHaveBeenCalledTimes(1);
  });

  it('Google: çift dokunuşta tek istek gider, ikinci dokunuş yok sayılır', async () => {
    const services = createMockServices();
    let finish: (value: 'signedIn') => void = () => {};
    const google = jest.spyOn(services.auth, 'signInWithGoogle').mockImplementation(
      () => new Promise((resolve) => (finish = resolve)),
    );
    await renderLogin(services);

    const button = screen.getByRole('button', { name: authTr.google.action });
    await fireEvent.press(button);
    await fireEvent.press(button);
    await fireEvent.press(screen.getByRole('button', { name: authTr.google.pending }));
    expect(google).toHaveBeenCalledTimes(1);

    finish('signedIn');
    await waitFor(() => expect(screen.getByRole('button', { name: authTr.google.action })).toBeTruthy());
  });

  it('unauthenticated hatası (oturum sona erdi) kullanıcıya Türkçe mesajla gösterilir, form açık kalır', async () => {
    const services = createMockServices();
    jest.spyOn(services.auth, 'signInWithEmail').mockRejectedValue(new ServiceError('unauthenticated', authTr.errors.unauthenticated));
    await renderLogin(services);

    await fillForm(MOCK_ACCOUNT_EMAIL, MOCK_ACCOUNT_PASSWORD);
    await fireEvent.press(submitButton());

    expect(await screen.findByText(authTr.errors.unauthenticated)).toBeTruthy();
    expect(screen.queryByRole('link', { name: authTr.retry })).toBeNull();
    expect(screen.getByRole('button', { name: authTr.login.submit })).toBeTruthy();
  });

  it('şifre göster/gizle düğmesi durumunu ekran okuyucuya bildirir', async () => {
    await renderLogin();
    const toggle = screen.getByRole('button', { name: authTr.fields.showPasswordLabel });
    expect(toggle.props.accessibilityState).toMatchObject({ selected: false });
    await fireEvent.press(toggle);
    expect(screen.getByRole('button', { name: authTr.fields.hidePasswordLabel }).props.accessibilityState).toMatchObject({
      selected: true,
    });
  });
});

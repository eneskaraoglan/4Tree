import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { authTr, fill } from '@/i18n';
import { createMockServices, ServicesProvider, type Services } from '@/services';
import { MOCK_ACCOUNT_EMAIL } from '@/services/mock/mockAuthService';

import { RegisterScreen } from './RegisterScreen';
import { PASSWORD_MIN_LENGTH } from './validation';

jest.mock('react-native-reanimated', () =>
  jest.requireActual('@/components/illustration/reanimatedTestMock').createReanimatedMock(),
);
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

const handlers = { onBack: jest.fn(), onLogin: jest.fn() };

async function renderRegister(services: Services = createMockServices()) {
  await render(
    <ServicesProvider services={services}>
      <RegisterScreen {...handlers} />
    </ServicesProvider>,
  );
  return services;
}

async function fillForm({ name = 'Zeynep', email = 'zeynep@ornek.com', password = 'agac12345' } = {}) {
  await fireEvent.changeText(screen.getByLabelText(authTr.fields.name), name);
  await fireEvent.changeText(screen.getByLabelText(authTr.fields.email), email);
  await fireEvent.changeText(screen.getByLabelText(authTr.fields.password), password);
}

const submitButton = () => screen.getByRole('button', { name: authTr.register.submit });

describe('RegisterScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('ad, e-posta, şifre alanlarını ve şifre ipucunu gösterir; onay satırı yok', async () => {
    await renderRegister();
    expect(screen.getByLabelText(authTr.fields.name)).toBeTruthy();
    expect(screen.getByLabelText(authTr.fields.email)).toBeTruthy();
    expect(screen.getByLabelText(authTr.fields.password)).toBeTruthy();
    expect(screen.getByText(fill(authTr.fields.passwordHint, { min: PASSWORD_MIN_LENGTH }))).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('boş gönderimde üç alan için de hata gösterir, servisi çağırmaz', async () => {
    const services = createMockServices();
    const signUp = jest.spyOn(services.auth, 'signUpWithEmail');
    await renderRegister(services);

    await fireEvent.press(submitButton());

    expect(screen.getByText(authTr.validation.nameRequired)).toBeTruthy();
    expect(screen.getByText(authTr.validation.emailRequired)).toBeTruthy();
    expect(screen.getByText(authTr.validation.passwordRequired)).toBeTruthy();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('8 karakterden kısa şifreyi reddeder; ipucu yerine hata görünür', async () => {
    const services = createMockServices();
    const signUp = jest.spyOn(services.auth, 'signUpWithEmail');
    await renderRegister(services);

    await fillForm({ password: '1234567' });
    await fireEvent.press(submitButton());

    const message = fill(authTr.validation.passwordShort, { min: PASSWORD_MIN_LENGTH });
    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.queryByText(fill(authTr.fields.passwordHint, { min: PASSWORD_MIN_LENGTH }))).toBeNull();
    expect(signUp).not.toHaveBeenCalled();
  });

  it('tam 8 karakterlik şifre kabul edilir', async () => {
    const services = createMockServices();
    const signUp = jest.spyOn(services.auth, 'signUpWithEmail');
    await renderRegister(services);

    await fillForm({ password: '12345678' });
    await fireEvent.press(submitButton());

    await waitFor(() => expect(signUp).toHaveBeenCalledTimes(1));
  });

  it('geçersiz e-postayı reddeder', async () => {
    await renderRegister();
    await fillForm({ email: 'zeynep@' });
    await fireEvent.press(submitButton());
    expect(screen.getByText(authTr.validation.emailInvalid)).toBeTruthy();
  });

  it('geçerli formda adı, e-postayı ve şifreyi servise gönderir; oturum açılır', async () => {
    const services = createMockServices();
    const signUp = jest.spyOn(services.auth, 'signUpWithEmail');
    await renderRegister(services);

    await fillForm();
    await fireEvent.press(submitButton());

    await waitFor(() => expect(signUp).toHaveBeenCalledWith({ name: 'Zeynep', email: 'zeynep@ornek.com', password: 'agac12345' }));
    await waitFor(async () => expect((await services.auth.getSession())?.user.name).toBe('Zeynep'));
  });

  it('kayıtlı e-postada "zaten kayıtlı" hatasını gösterir', async () => {
    await renderRegister();
    await fillForm({ email: MOCK_ACCOUNT_EMAIL });
    await fireEvent.press(submitButton());
    expect(await screen.findByText(authTr.errors.emailTaken)).toBeTruthy();
  });

  it('e-posta onayı gerekiyorsa "E-postanı kontrol et" durumuna geçer', async () => {
    const services = createMockServices();
    jest.spyOn(services.auth, 'signUpWithEmail').mockResolvedValue({ status: 'confirmationRequired' });
    await renderRegister(services);

    await fillForm();
    await fireEvent.press(submitButton());

    expect(await screen.findByRole('header', { name: authTr.register.confirmTitle })).toBeTruthy();
    expect(screen.getByText(fill(authTr.register.confirmMessage, { email: 'zeynep@ornek.com' }))).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: authTr.register.confirmAction }));
    expect(handlers.onLogin).toHaveBeenCalledTimes(1);
  });

  it('Giriş bağlantısı ve geri düğmesi çalışır', async () => {
    await renderRegister();
    await fireEvent.press(screen.getByRole('link', { name: authTr.register.toLogin }));
    await fireEvent.press(screen.getByRole('button', { name: authTr.back }));
    expect(handlers.onLogin).toHaveBeenCalledTimes(1);
    expect(handlers.onBack).toHaveBeenCalledTimes(1);
  });
});

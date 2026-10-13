import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { authTr, fill } from '@/i18n';
import { createMockServices, ServiceError, ServicesProvider, type Services } from '@/services';

import { ResetPasswordScreen } from './ResetPasswordScreen';
import { PASSWORD_MIN_LENGTH } from './validation';

jest.mock('react-native-reanimated', () =>
  jest.requireActual('@/components/illustration/reanimatedTestMock').createReanimatedMock(),
);
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

const handlers = { onDone: jest.fn(), onCancel: jest.fn() };

async function renderReset(services: Services = createMockServices({ signedIn: true })) {
  await render(
    <ServicesProvider services={services}>
      <ResetPasswordScreen {...handlers} />
    </ServicesProvider>,
  );
  return services;
}

async function fill2(password: string, confirmation: string) {
  await fireEvent.changeText(screen.getByLabelText(authTr.resetPassword.newPassword), password);
  await fireEvent.changeText(screen.getByLabelText(authTr.resetPassword.confirmPassword), confirmation);
}

const submit = () => screen.getByRole('button', { name: authTr.resetPassword.submit });

describe('ResetPasswordScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('iki alan gösterir; boş gönderimde iki hata çıkar, servis çağrılmaz', async () => {
    const services = await renderReset();
    const update = jest.spyOn(services.auth, 'updatePassword');
    await fireEvent.press(submit());
    expect(screen.getByText(authTr.validation.passwordRequired)).toBeTruthy();
    expect(screen.getByText(authTr.validation.confirmRequired)).toBeTruthy();
    expect(update).not.toHaveBeenCalled();
  });

  it('kısa şifreyi ve eşleşmeyen tekrarı reddeder', async () => {
    const services = await renderReset();
    const update = jest.spyOn(services.auth, 'updatePassword');

    await fill2('1234567', '1234567');
    await fireEvent.press(submit());
    expect(screen.getByText(fill(authTr.validation.passwordShort, { min: PASSWORD_MIN_LENGTH }))).toBeTruthy();

    await fill2('agac12345', 'agac12346');
    await fireEvent.press(submit());
    expect(screen.getByText(authTr.validation.passwordMismatch)).toBeTruthy();
    expect(update).not.toHaveBeenCalled();
  });

  it('geçerli çiftle yeni şifreyi kaydeder ve onDone çağrılır', async () => {
    const services = await renderReset();
    const update = jest.spyOn(services.auth, 'updatePassword');
    await fill2('yeni-sifre-1', 'yeni-sifre-1');
    await fireEvent.press(submit());
    await waitFor(() => expect(handlers.onDone).toHaveBeenCalledTimes(1));
    expect(update).toHaveBeenCalledWith('yeni-sifre-1');
  });

  it('servis hatasında (aynı şifre, oturum yok) Türkçe mesaj gösterir, onDone çağrılmaz', async () => {
    const services = await renderReset();
    jest
      .spyOn(services.auth, 'updatePassword')
      .mockRejectedValueOnce(new ServiceError('invalid', authTr.errors.samePassword))
      .mockRejectedValueOnce(new ServiceError('unauthenticated', authTr.errors.unauthenticated));
    await fill2('yeni-sifre-1', 'yeni-sifre-1');

    await fireEvent.press(submit());
    expect(await screen.findByText(authTr.errors.samePassword)).toBeTruthy();
    await fireEvent.press(submit());
    expect(await screen.findByText(authTr.errors.unauthenticated)).toBeTruthy();
    expect(handlers.onDone).not.toHaveBeenCalled();
  });

  it('Vazgeç bağlantısı onCancel çağırır', async () => {
    await renderReset();
    await fireEvent.press(screen.getByRole('link', { name: authTr.resetPassword.cancel }));
    expect(handlers.onCancel).toHaveBeenCalledTimes(1);
  });
});

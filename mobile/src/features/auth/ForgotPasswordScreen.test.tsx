import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { authTr, fill } from '@/i18n';
import { createMockServices, ServiceError, ServicesProvider, type Services } from '@/services';

import { ForgotPasswordScreen } from './ForgotPasswordScreen';

jest.mock('react-native-reanimated', () =>
  jest.requireActual('@/components/illustration/reanimatedTestMock').createReanimatedMock(),
);
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

const handlers = { onBack: jest.fn(), onBackToLogin: jest.fn() };

async function renderForgot(services: Services = createMockServices()) {
  await render(
    <ServicesProvider services={services}>
      <ForgotPasswordScreen {...handlers} />
    </ServicesProvider>,
  );
  return services;
}

const submitButton = () => screen.getByRole('button', { name: authTr.forgot.submit });

describe('ForgotPasswordScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('boş e-postada hata gösterir ve servisi çağırmaz', async () => {
    const services = createMockServices();
    const reset = jest.spyOn(services.auth, 'sendPasswordReset');
    await renderForgot(services);

    await fireEvent.press(submitButton());

    expect(screen.getByText(authTr.validation.emailRequired)).toBeTruthy();
    expect(reset).not.toHaveBeenCalled();
  });

  it('geçerli e-postayla bağlantı ister ve başarı durumunu gösterir', async () => {
    const services = createMockServices();
    const reset = jest.spyOn(services.auth, 'sendPasswordReset');
    await renderForgot(services);

    await fireEvent.changeText(screen.getByLabelText(authTr.fields.email), ' kimse@ornek.com ');
    await fireEvent.press(submitButton());

    await waitFor(() => expect(reset).toHaveBeenCalledWith(' kimse@ornek.com '));
    expect(await screen.findByRole('header', { name: authTr.forgot.sentTitle })).toBeTruthy();
    expect(screen.getByText(fill(authTr.forgot.sentMessage, { email: 'kimse@ornek.com' }))).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: authTr.forgot.backToLogin }));
    expect(handlers.onBackToLogin).toHaveBeenCalledTimes(1);
  });

  it('ağ hatasında formda kalır, hata ve "Tekrar dene" gösterir', async () => {
    const services = createMockServices();
    jest.spyOn(services.auth, 'sendPasswordReset').mockRejectedValueOnce(new ServiceError('network', authTr.errors.network));
    await renderForgot(services);

    await fireEvent.changeText(screen.getByLabelText(authTr.fields.email), 'kimse@ornek.com');
    await fireEvent.press(submitButton());

    expect(await screen.findByText(authTr.errors.network)).toBeTruthy();
    expect(screen.queryByRole('header', { name: authTr.forgot.sentTitle })).toBeNull();

    await fireEvent.press(screen.getByRole('link', { name: authTr.retry }));
    expect(await screen.findByRole('header', { name: authTr.forgot.sentTitle })).toBeTruthy();
  });

  it('geri düğmesi çalışır', async () => {
    await renderForgot();
    await fireEvent.press(screen.getByRole('button', { name: authTr.back }));
    expect(handlers.onBack).toHaveBeenCalledTimes(1);
  });
});

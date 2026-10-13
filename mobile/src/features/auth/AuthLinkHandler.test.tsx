import * as Linking from 'expo-linking';
import { render, waitFor } from '@testing-library/react-native';

import { authTr } from '@/i18n/auth';
import { createMockServices, ServiceError, ServicesProvider } from '@/services';

import { AuthLinkHandler } from './AuthLinkHandler';
import { showMessage } from './showMessage';

jest.mock('./showMessage', () => ({ showMessage: jest.fn() }));
jest.mock('expo-linking', () => ({
  getInitialURL: jest.fn(),
  addEventListener: jest.fn(),
}));

const linking = jest.mocked(Linking);

describe('AuthLinkHandler', () => {
  let emit: (url: string) => void;
  const remove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    linking.getInitialURL.mockResolvedValue(null);
    linking.addEventListener.mockImplementation(((_type: string, listener: (event: { url: string }) => void) => {
      emit = (url) => listener({ url });
      return { remove };
    }) as never);
  });

  it('soğuk açılıştaki ilk bağlantıyı ve açıkken gelenleri servise iletir (aynı adresi bir kez)', async () => {
    const services = createMockServices();
    const complete = jest.spyOn(services.auth, 'completeAuthLink');
    linking.getInitialURL.mockResolvedValue('fourtree://auth-callback?code=confirm-1');

    const { unmount } = await render(
      <ServicesProvider services={services}>
        <AuthLinkHandler />
      </ServicesProvider>,
    );
    await waitFor(() => expect(complete).toHaveBeenCalledWith('fourtree://auth-callback?code=confirm-1'));

    emit('fourtree://auth-callback?code=confirm-1');
    emit('fourtree://auth-callback?code=recovery-2');
    expect(complete).toHaveBeenCalledTimes(2);
    expect(complete).toHaveBeenLastCalledWith('fourtree://auth-callback?code=recovery-2');
    expect(await services.auth.getSession()).not.toBeNull();

    await unmount();
    expect(remove).toHaveBeenCalled();
  });

  it('geçersiz/süresi dolmuş bağlantıyı kullanıcıya bildirir', async () => {
    const services = createMockServices();
    jest.spyOn(services.auth, 'completeAuthLink').mockRejectedValue(new ServiceError('invalid', authTr.errors.linkInvalid));
    await render(
      <ServicesProvider services={services}>
        <AuthLinkHandler />
      </ServicesProvider>,
    );
    emit('fourtree://auth-callback?code=eski');
    await waitFor(() => expect(showMessage).toHaveBeenCalledWith(authTr.link.errorTitle, authTr.errors.linkInvalid));
  });

  it('adres yoksa hiçbir şey yapmaz', async () => {
    const services = createMockServices();
    const complete = jest.spyOn(services.auth, 'completeAuthLink');
    await render(
      <ServicesProvider services={services}>
        <AuthLinkHandler />
      </ServicesProvider>,
    );
    expect(complete).not.toHaveBeenCalled();
  });
});

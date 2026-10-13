import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { authTr } from '@/i18n/auth';
import { createMockServices, ServiceError, ServicesProvider, type Services } from '@/services';
import { createMockAuthService, MOCK_ACCOUNT_EMAIL, MOCK_ACCOUNT_PASSWORD } from '@/services/mock/mockAuthService';

import { clearActivityLocalData } from '@/features/activity/clearActivityLocalData';
import { AUTH_LOAD_TIMEOUT_MS, AuthProvider, useAuth } from './AuthProvider';
import { showMessage } from './showMessage';
import { useSignOut } from './useSignOut';

jest.mock('./showMessage', () => ({ showMessage: jest.fn() }));
jest.mock('@/features/activity/clearActivityLocalData', () => ({ clearActivityLocalData: jest.fn(() => Promise.resolve()) }));

const clearLocalData = jest.mocked(clearActivityLocalData);

function Probe() {
  const { status, session, recovery, finishRecovery } = useAuth();
  const signOut = useSignOut();
  return (
    <>
      <Text testID="status">{status}</Text>
      <Text testID="name">{session?.user.name ?? '-'}</Text>
      <Text testID="recovery">{recovery ? 'yes' : 'no'}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="bitir" onPress={finishRecovery}>
        <Text>bitir</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="çıkış" onPress={signOut}>
        <Text>çıkış</Text>
      </Pressable>
    </>
  );
}

async function renderProbe(services: Services) {
  await render(
    <ServicesProvider services={services}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </ServicesProvider>,
  );
}

const status = () => screen.getByTestId('status').props.children as string;

describe('AuthProvider', () => {
  beforeEach(() => jest.clearAllMocks());

  it('oturum yokken loading sonra signedOut olur', async () => {
    await renderProbe(createMockServices());
    await waitFor(() => expect(status()).toBe('signedOut'));
    expect(screen.getByTestId('name').props.children).toBe('-');
  });

  it('kayıtlı oturum varsa signedIn olur ve kullanıcıyı verir', async () => {
    await renderProbe(createMockServices({ signedIn: true }));
    await waitFor(() => expect(status()).toBe('signedIn'));
    expect(screen.getByTestId('name').props.children).toBe('Elif');
  });

  it('başlangıçta loading durumundadır (splash açık kalsın diye)', async () => {
    const services = createMockServices({ latencyMs: 50 });
    await renderProbe(services);
    expect(status()).toBe('loading');
    await waitFor(() => expect(status()).toBe('signedOut'));
  });

  it('giriş yapılınca signedIn, süre dolunca ya da çıkışta signedOut olur', async () => {
    const auth = createMockAuthService();
    await renderProbe({ ...createMockServices(), auth });
    await waitFor(() => expect(status()).toBe('signedOut'));

    await act(async () => {
      await auth.signInWithEmail({ email: MOCK_ACCOUNT_EMAIL, password: MOCK_ACCOUNT_PASSWORD });
    });
    expect(status()).toBe('signedIn');

    await act(async () => auth.expireSession());
    expect(status()).toBe('signedOut');

    await act(async () => {
      await auth.signInWithGoogle();
    });
    expect(status()).toBe('signedIn');
    await fireEvent.press(screen.getByRole('button', { name: 'çıkış' }));
    await waitFor(() => expect(status()).toBe('signedOut'));
  });

  it('oturum okunamazsa (hata) signedOut\'a düşer', async () => {
    await renderProbe(createMockServices({ scenario: 'error', signedIn: true }));
    await waitFor(() => expect(status()).toBe('signedOut'));
  });

  it('çıkış başarısız olursa hatayı kullanıcıya gösterir, oturum açık kalır', async () => {
    const services = createMockServices({ signedIn: true });
    jest.spyOn(services.auth, 'signOut').mockRejectedValue(new ServiceError('network', authTr.errors.network));
    await renderProbe(services);
    await waitFor(() => expect(status()).toBe('signedIn'));

    await fireEvent.press(screen.getByRole('button', { name: 'çıkış' }));

    await waitFor(() => expect(showMessage).toHaveBeenCalledWith(authTr.signOutError.title, authTr.errors.network));
    expect(status()).toBe('signedIn');
  });

  it('okuma çok uzarsa zaman aşımıyla signedOut olur; geç gelen oturum yine uygulanır', async () => {
    jest.useFakeTimers();
    try {
      const auth = createMockAuthService();
      jest.spyOn(auth, 'getSession').mockImplementation(() => new Promise(() => {}));
      await renderProbe({ ...createMockServices(), auth });
      expect(status()).toBe('loading');

      await act(async () => {
        jest.advanceTimersByTime(AUTH_LOAD_TIMEOUT_MS);
      });
      expect(status()).toBe('signedOut');

      await act(async () => {
        await auth.signInWithEmail({ email: MOCK_ACCOUNT_EMAIL, password: MOCK_ACCOUNT_PASSWORD });
      });
      expect(status()).toBe('signedIn');
    } finally {
      jest.useRealTimers();
    }
  });

  it('dinleyici daha yeni durum bildirdiyse eski getSession sonucu onu ezmez', async () => {
    const auth = createMockAuthService();
    let resolveSession: (value: null | { user: { id: string; email: string; name: string } }) => void = () => {};
    jest.spyOn(auth, 'getSession').mockImplementation(() => new Promise((resolve) => (resolveSession = resolve)));
    await renderProbe({ ...createMockServices(), auth });

    await act(async () => {
      await auth.signInWithEmail({ email: MOCK_ACCOUNT_EMAIL, password: MOCK_ACCOUNT_PASSWORD });
    });
    expect(status()).toBe('signedIn');

    await act(async () => resolveSession(null));
    expect(status()).toBe('signedIn');
  });

  it('useAuth Provider dışında anlaşılır hata verir', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(render(<Probe />)).rejects.toThrow('AuthProvider');
    spy.mockRestore();
  });

  it('açılışta oturumsuzluk yerel aktivite verisini silmez; oturum açıkken kapanış siler', async () => {
    const auth = createMockAuthService();
    await renderProbe({ ...createMockServices(), auth });
    await waitFor(() => expect(status()).toBe('signedOut'));
    expect(clearLocalData).not.toHaveBeenCalled();

    await act(async () => {
      await auth.signInWithEmail({ email: MOCK_ACCOUNT_EMAIL, password: MOCK_ACCOUNT_PASSWORD });
    });
    expect(clearLocalData).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'çıkış' }));
    await waitFor(() => expect(status()).toBe('signedOut'));
    expect(clearLocalData).toHaveBeenCalledTimes(1);
  });

  it('oturum süresi dolunca da (signedIn > signedOut) yerel veri silinir', async () => {
    const auth = createMockAuthService({ signedIn: true });
    await renderProbe({ ...createMockServices(), auth });
    await waitFor(() => expect(status()).toBe('signedIn'));
    await act(async () => auth.expireSession());
    expect(clearLocalData).toHaveBeenCalledTimes(1);
  });

  it('temizlik hata verirse çıkış etkilenmez', async () => {
    clearLocalData.mockRejectedValueOnce(new Error('depo hatası'));
    const auth = createMockAuthService({ signedIn: true });
    await renderProbe({ ...createMockServices(), auth });
    await waitFor(() => expect(status()).toBe('signedIn'));
    await act(async () => auth.expireSession());
    expect(status()).toBe('signedOut');
  });

  it('şifre sıfırlama olayı kurtarma modunu açar; token yenileme bozmaz, finishRecovery ve çıkış kapatır', async () => {
    const auth = createMockAuthService();
    await renderProbe({ ...createMockServices(), auth });
    await waitFor(() => expect(status()).toBe('signedOut'));
    expect(screen.getByTestId('recovery').props.children).toBe('no');

    await act(async () => {
      await auth.completeAuthLink('fourtree://auth-callback?code=recovery-1');
    });
    expect(status()).toBe('signedIn');
    expect(screen.getByTestId('recovery').props.children).toBe('yes');

    // Aynı kullanıcı için sıradan bir "signedIn" olayı kurtarma modunu kapatmaz.
    await act(async () => {
      await auth.signInWithEmail({ email: MOCK_ACCOUNT_EMAIL, password: MOCK_ACCOUNT_PASSWORD });
    });
    expect(screen.getByTestId('recovery').props.children).toBe('yes');

    await fireEvent.press(screen.getByRole('button', { name: 'bitir' }));
    expect(screen.getByTestId('recovery').props.children).toBe('no');
    expect(status()).toBe('signedIn');

    await act(async () => {
      await auth.completeAuthLink('fourtree://auth-callback?code=recovery-2');
    });
    expect(screen.getByTestId('recovery').props.children).toBe('yes');
    await act(async () => auth.expireSession());
    expect(screen.getByTestId('recovery').props.children).toBe('no');
  });
});

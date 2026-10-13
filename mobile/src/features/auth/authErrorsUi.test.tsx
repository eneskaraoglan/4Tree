import type { SupabaseClient } from '@supabase/supabase-js';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { authTr } from '@/i18n/auth';
import { createMockServices, ServicesProvider } from '@/services';
import { createSupabaseAuthService } from '@/services/supabase/supabaseAuthService';

import { RegisterScreen } from './RegisterScreen';

jest.mock('react-native-reanimated', () =>
  jest.requireActual('@/components/illustration/reanimatedTestMock').createReanimatedMock(),
);
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));
jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn(), openAuthSessionAsync: jest.fn() }));
jest.mock('expo-linking', () => ({ createURL: jest.fn((path: string) => `fourtree://${path}`) }));

/** Kayıt ekranı + gerçek Supabase servisi + sahte istemci: sunucu hata kodundan ekrandaki metne uçtan uca. */
async function renderWithSignUpResult(result: Record<string, unknown>) {
  const client = {
    auth: {
      signUp: jest.fn(async () => result),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  } as unknown as SupabaseClient;
  const services = { ...createMockServices(), auth: createSupabaseAuthService(client) };
  await render(
    <ServicesProvider services={services}>
      <RegisterScreen onBack={jest.fn()} onLogin={jest.fn()} />
    </ServicesProvider>,
  );
  await fireEvent.changeText(screen.getByLabelText(authTr.fields.name), 'Zeynep');
  await fireEvent.changeText(screen.getByLabelText(authTr.fields.email), 'zeynep@ornek.com');
  await fireEvent.changeText(screen.getByLabelText(authTr.fields.password), 'agac12345');
  await fireEvent.press(screen.getByRole('button', { name: authTr.register.submit }));
}

describe('kayıt hataları (Supabase kodu > ekran metni)', () => {
  it.each([
    ['user_already_exists', 422, authTr.errors.emailTaken],
    ['email_exists', 422, authTr.errors.emailTaken],
    ['weak_password', 422, authTr.errors.weakPassword],
    ['over_email_send_rate_limit', 429, authTr.errors.tooManyRequests],
  ])('%s hatası "%s" durumunda Türkçe metni gösterir, ham mesajı göstermez', async (code, status, message) => {
    await renderWithSignUpResult({
      data: { user: null, session: null },
      error: { name: 'AuthApiError', code, status, message: 'RAW ENGLISH MESSAGE' },
    });
    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.queryByText(/RAW ENGLISH/)).toBeNull();
  });

  it('e-posta onayı açıkken kayıtlı adres (boş identities) "zaten kayıtlı" gösterir', async () => {
    await renderWithSignUpResult({ data: { user: { identities: [] }, session: null }, error: null });
    expect(await screen.findByText(authTr.errors.emailTaken)).toBeTruthy();
  });

  it('ağ kopukken "Tekrar dene" bağlantısı çıkar', async () => {
    await renderWithSignUpResult({
      data: { user: null, session: null },
      error: { name: 'AuthRetryableFetchError', status: 0, message: 'Network request failed' },
    });
    expect(await screen.findByText(authTr.errors.network)).toBeTruthy();
    expect(screen.getByRole('link', { name: authTr.retry })).toBeTruthy();
  });
});

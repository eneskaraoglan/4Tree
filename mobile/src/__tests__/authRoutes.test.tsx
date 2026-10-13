import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';

import * as AuthLayout from '@/app/(auth)/_layout';
import ForgotPasswordRoute from '@/app/(auth)/forgot-password';
import LoginRoute from '@/app/(auth)/login';
import RegisterRoute from '@/app/(auth)/register';
import WelcomeRoute from '@/app/(auth)/welcome';
import ProfileRoute from '@/app/(tabs)/profile';
import TabsLayout from '@/app/(tabs)/_layout';
import NotFoundRoute from '@/app/+not-found';
import ResetPasswordRoute from '@/app/(auth)/reset-password';
import RootLayout from '@/app/_layout';
import { authTr } from '@/i18n';
import { createMockServices, ServicesProvider, type Services } from '@/services';
import { MOCK_ACCOUNT_EMAIL, MOCK_ACCOUNT_PASSWORD } from '@/services/mock/mockAuthService';

// expo-router/testing-library kendi Reanimated sahtesini `react-native-reanimated/mock` ile kurar ve bizimkini ezer;
// o yolu da hafif sahteyle değiştirerek ikisini aynı yapıyoruz.
jest.mock('react-native-reanimated', () =>
  jest.requireActual('@/components/illustration/reanimatedTestMock').createReanimatedMock(),
);
jest.mock('react-native-reanimated/mock', () =>
  jest.requireActual('@/components/illustration/reanimatedTestMock').createReanimatedMock(),
);
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));
// Yazı tipi yüklemesi bu testin konusu değil: hazır sayılır.
jest.mock('@/features/activity/clearActivityLocalData', () => ({ clearActivityLocalData: jest.fn(() => Promise.resolve()) }));
jest.mock('@/theme/useAppFonts', () => ({ useAppFonts: () => true }));
// Onay penceresi (Alert) yerine doğrudan onay verilir.
jest.mock('@/features/profile/confirmAction', () => ({
  confirmAction: ({ onConfirm }: { onConfirm: () => void }) => onConfirm(),
}));

const RunStub = () => <Text>Koşu ekranı</Text>;
const Stub = () => null;

/**
 * Dönen değer Promise'tir ama RTL v14'te `getPathname` gibi yönlendirme yardımcıları Promise'in üstündedir;
 * bu yüzden async yapılmaz. Testlerde `await` edilir, pathname denetimi için nesnenin kendisi kullanılır.
 */
function renderApp(services: Services, initialUrl = '/') {
  const Root = () => (
    <ServicesProvider services={services}>
      <RootLayout />
    </ServicesProvider>
  );
  return renderRouter(
    {
      _layout: Root,
      '(auth)/_layout': AuthLayout,
      '(auth)/welcome': WelcomeRoute,
      '(auth)/login': LoginRoute,
      '(auth)/register': RegisterRoute,
      '(auth)/forgot-password': ForgotPasswordRoute,
      '(auth)/reset-password': ResetPasswordRoute,
      '+not-found': NotFoundRoute,
      '(tabs)/_layout': TabsLayout,
      '(tabs)/index': RunStub,
      '(tabs)/forest': Stub,
      '(tabs)/achievements': Stub,
      '(tabs)/feed': Stub,
      '(tabs)/profile': ProfileRoute,
      activity: Stub,
      'edit-profile': Stub,
      'post-detail': Stub,
      'user-profile': Stub,
      friends: Stub,
      'post-composer': Stub,
    },
    { initialUrl },
  );
}

describe('korumalı rotalar', () => {
  it('oturum yokken açılış karşılama ekranıdır, sekmeler görünmez', async () => {
    const app = renderApp(createMockServices());
    await app;
    expect(await screen.findByText('Her 20 km, gerçek bir ağaç.')).toBeTruthy();
    expect(app.getPathname()).toBe('/welcome');
    expect(screen.queryByText('Koşu ekranı')).toBeNull();
  });

  it('oturum açıkken açılış sekmelerdir, karşılama görünmez', async () => {
    await renderApp(createMockServices({ signedIn: true }));
    expect(await screen.findByText('Koşu ekranı')).toBeTruthy();
    expect(screen.queryByText('Her 20 km, gerçek bir ağaç.')).toBeNull();
  });

  it('oturum yüklenirken hiçbir şey çizilmez (splash açık), sonra karşılama gelir', async () => {
    await renderApp(createMockServices({ latencyMs: 40 }));
    expect(screen.queryByText('Her 20 km, gerçek bir ağaç.')).toBeNull();
    expect(screen.queryByText('Koşu ekranı')).toBeNull();
    expect(await screen.findByText('Her 20 km, gerçek bir ağaç.')).toBeTruthy();
  });

  it('oturum yokken korumalı sekmeye derin bağlantı karşılamaya düşer', async () => {
    await renderApp(createMockServices(), '/profile');
    expect(await screen.findByText('Her 20 km, gerçek bir ağaç.')).toBeTruthy();
    expect(screen.queryByText(authTr.login.submitting)).toBeNull();
  });

  it('oturum açıkken giriş akışı rotalarına gidilemez', async () => {
    await renderApp(createMockServices({ signedIn: true }), '/login');
    expect(await screen.findByText('Koşu ekranı')).toBeTruthy();
    expect(screen.queryByLabelText(authTr.fields.email)).toBeNull();
  });
});

describe('giriş akışı', () => {
  it('karşılama > giriş > başarılı giriş sekmelere geçirir', async () => {
    const app = renderApp(createMockServices());
    await app;
    await fireEvent.press(await screen.findByRole('button', { name: authTr.welcome.login }));
    expect(await screen.findByLabelText(authTr.fields.email)).toBeTruthy();
    expect(app.getPathname()).toBe('/login');

    await fireEvent.changeText(screen.getByLabelText(authTr.fields.email), MOCK_ACCOUNT_EMAIL);
    await fireEvent.changeText(screen.getByLabelText(authTr.fields.password), MOCK_ACCOUNT_PASSWORD);
    await fireEvent.press(screen.getByRole('button', { name: authTr.login.submit }));

    expect(await screen.findByText('Koşu ekranı')).toBeTruthy();
    expect(screen.queryByLabelText(authTr.fields.email)).toBeNull();
  });

  it('yanlış şifrede giriş ekranında kalır ve hata gösterir', async () => {
    const app = renderApp(createMockServices());
    await app;
    await fireEvent.press(await screen.findByRole('button', { name: authTr.welcome.login }));
    await fireEvent.changeText(await screen.findByLabelText(authTr.fields.email), MOCK_ACCOUNT_EMAIL);
    await fireEvent.changeText(screen.getByLabelText(authTr.fields.password), 'yanlis-sifre');
    await fireEvent.press(screen.getByRole('button', { name: authTr.login.submit }));

    expect(await screen.findByText(authTr.errors.invalidCredentials)).toBeTruthy();
    expect(app.getPathname()).toBe('/login');
    expect(screen.queryByText('Koşu ekranı')).toBeNull();
  });

  it('karşılama > hesap oluştur > kayıt sekmelere geçirir; girişe geçiş yığını büyütmez', async () => {
    const app = renderApp(createMockServices());
    await app;
    await fireEvent.press(await screen.findByRole('button', { name: authTr.welcome.register }));
    expect(await screen.findByLabelText(authTr.fields.name)).toBeTruthy();
    expect(app.getPathname()).toBe('/register');

    await fireEvent.press(screen.getByRole('link', { name: authTr.register.toLogin }));
    expect(await screen.findByRole('header', { name: authTr.login.title })).toBeTruthy();
    expect(app.getPathname()).toBe('/login');

    await fireEvent.press(screen.getByRole('link', { name: authTr.login.toRegister }));
    await fireEvent.changeText(await screen.findByLabelText(authTr.fields.name), 'Defne');
    await fireEvent.changeText(screen.getByLabelText(authTr.fields.email), 'defne@ornek.com');
    await fireEvent.changeText(screen.getByLabelText(authTr.fields.password), 'agac12345');
    await fireEvent.press(screen.getByRole('button', { name: authTr.register.submit }));
    expect(await screen.findByText('Koşu ekranı')).toBeTruthy();
  });

  it('şifremi unuttum ekranına gidilir, bağlantı gönderilince başarı görünür, girişe dönülür', async () => {
    const app = renderApp(createMockServices());
    await app;
    await fireEvent.press(await screen.findByRole('button', { name: authTr.welcome.login }));
    await fireEvent.press(await screen.findByRole('link', { name: authTr.login.forgot }));
    expect(await screen.findByRole('header', { name: authTr.forgot.title })).toBeTruthy();
    expect(app.getPathname()).toBe('/forgot-password');

    await fireEvent.changeText(screen.getByLabelText(authTr.fields.email), 'kimse@ornek.com');
    await fireEvent.press(screen.getByRole('button', { name: authTr.forgot.submit }));
    expect(await screen.findByRole('header', { name: authTr.forgot.sentTitle })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: authTr.forgot.backToLogin }));
    expect(await screen.findByRole('header', { name: authTr.login.title })).toBeTruthy();
    expect(app.getPathname()).toBe('/login');
  });

  it('geri düğmesi önceki ekrana döner', async () => {
    const app = renderApp(createMockServices());
    await app;
    await fireEvent.press(await screen.findByRole('button', { name: authTr.welcome.login }));
    await fireEvent.press(await screen.findByRole('button', { name: authTr.back }));
    expect(await screen.findByText('Her 20 km, gerçek bir ağaç.')).toBeTruthy();
    expect(app.getPathname()).toBe('/welcome');
  });
});

describe('çıkış ve süre dolması', () => {
  it('Profil > Çıkış yap karşılamaya döndürür', async () => {
    const services = createMockServices({ signedIn: true });
    const app = renderApp(services);
    await app;
    await fireEvent.press(await screen.findByText('Profil'));
    await fireEvent.press(await screen.findByText('Çıkış yap'));

    expect(await screen.findByText('Her 20 km, gerçek bir ağaç.')).toBeTruthy();
    expect(app.getPathname()).toBe('/welcome');
    expect(await services.auth.getSession()).toBeNull();
  });

  it('oturum süresi dolunca karşılamaya düşer', async () => {
    const services = createMockServices({ signedIn: true });
    await renderApp(services);
    expect(await screen.findByText('Koşu ekranı')).toBeTruthy();

    await act(async () => {
      (services.auth as unknown as { expireSession(): void }).expireSession();
    });
    await waitFor(() => expect(screen.getByText('Her 20 km, gerçek bir ağaç.')).toBeTruthy());
    expect(screen.queryByText('Koşu ekranı')).toBeNull();
  });
});

describe('bilinmeyen adresler', () => {
  it('oturum yokken bilinmeyen derin bağlantı karşılamaya gider', async () => {
    const app = renderApp(createMockServices(), '/yok-boyle-bir-sayfa');
    await app;
    expect(await screen.findByText('Her 20 km, gerçek bir ağaç.')).toBeTruthy();
    expect(app.getPathname()).toBe('/welcome');
  });

  it('oturum açıkken bilinmeyen derin bağlantı sekmelere gider', async () => {
    const app = renderApp(createMockServices({ signedIn: true }), '/yok-boyle-bir-sayfa');
    await app;
    expect(await screen.findByText('Koşu ekranı')).toBeTruthy();
    expect(app.getPathname()).toBe('/');
  });

  it('eski Google/e-posta dönüş adresi (auth-callback) de karşılamaya düşer', async () => {
    const app = renderApp(createMockServices(), '/auth-callback');
    await app;
    expect(await screen.findByText('Her 20 km, gerçek bir ağaç.')).toBeTruthy();
  });
});

describe('şifre sıfırlama dönüşü', () => {
  const recoveryLink = 'fourtree://auth-callback?code=recovery-1';

  it('bağlantıyla dönen kullanıcı yeni şifre ekranına gelir, kaydedince sekmelere geçer', async () => {
    const services = createMockServices();
    const app = renderApp(services);
    await app;
    expect(await screen.findByText('Her 20 km, gerçek bir ağaç.')).toBeTruthy();

    await act(async () => {
      await services.auth.completeAuthLink(recoveryLink);
    });
    expect(await screen.findByRole('header', { name: authTr.resetPassword.title })).toBeTruthy();
    expect(app.getPathname()).toBe('/reset-password');
    expect(screen.queryByText('Koşu ekranı')).toBeNull();

    await fireEvent.changeText(screen.getByLabelText(authTr.resetPassword.newPassword), 'yeni-sifre-1');
    await fireEvent.changeText(screen.getByLabelText(authTr.resetPassword.confirmPassword), 'yeni-sifre-1');
    await fireEvent.press(screen.getByRole('button', { name: authTr.resetPassword.submit }));

    expect(await screen.findByText('Koşu ekranı')).toBeTruthy();
    expect(screen.queryByLabelText(authTr.resetPassword.newPassword)).toBeNull();
  });

  it('oturum açıkken sıfırlama bağlantısı gelirse sekmeler yerine yeni şifre ekranı açılır', async () => {
    const services = createMockServices({ signedIn: true });
    await renderApp(services);
    expect(await screen.findByText('Koşu ekranı')).toBeTruthy();

    await act(async () => {
      await services.auth.completeAuthLink(recoveryLink);
    });
    expect(await screen.findByRole('header', { name: authTr.resetPassword.title })).toBeTruthy();
    expect(screen.queryByText('Koşu ekranı')).toBeNull();
  });

  it('Vazgeç geçici oturumu kapatır ve karşılamaya döner; yeni şifre ekranına geri dönülemez', async () => {
    const services = createMockServices();
    const app = renderApp(services);
    await app;
    await screen.findByText('Her 20 km, gerçek bir ağaç.');
    await act(async () => {
      await services.auth.completeAuthLink(recoveryLink);
    });
    await fireEvent.press(await screen.findByRole('link', { name: authTr.resetPassword.cancel }));

    expect(await screen.findByText('Her 20 km, gerçek bir ağaç.')).toBeTruthy();
    expect(await services.auth.getSession()).toBeNull();
    expect(app.getPathname()).toBe('/welcome');
  });

  it('e-posta onay bağlantısı oturumu açar ve doğrudan sekmelere geçirir', async () => {
    const services = createMockServices();
    await renderApp(services);
    await screen.findByText('Her 20 km, gerçek bir ağaç.');
    await act(async () => {
      await services.auth.completeAuthLink('fourtree://auth-callback?code=confirm-1');
    });
    expect(await screen.findByText('Koşu ekranı')).toBeTruthy();
  });
});

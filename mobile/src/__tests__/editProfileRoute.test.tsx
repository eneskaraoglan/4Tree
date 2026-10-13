import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';

import * as AuthLayout from '@/app/(auth)/_layout';
import WelcomeRoute from '@/app/(auth)/welcome';
import TabsLayout from '@/app/(tabs)/_layout';
import ProfileRoute from '@/app/(tabs)/profile';
import EditProfileRoute from '@/app/edit-profile';
import RootLayout from '@/app/_layout';
import { profileTr } from '@/i18n';
import { createMockServices, ServicesProvider, type Services } from '@/services';

// expo-router/testing-library kendi Reanimated sahtesini kurar ve bizimkini ezer; ikisi de aynı sahteye yönlendirilir.
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
jest.mock('@/theme/useAppFonts', () => ({ useAppFonts: () => true }));

const Stub = () => null;
const edit = profileTr.edit;

function renderApp(services: Services, initialUrl = '/profile') {
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
      '(tabs)/_layout': TabsLayout,
      '(tabs)/index': () => <Text>Koşu ekranı</Text>,
      '(tabs)/forest': Stub,
      '(tabs)/achievements': Stub,
      '(tabs)/feed': Stub,
      '(tabs)/profile': ProfileRoute,
      activity: Stub,
      'edit-profile': EditProfileRoute,
      'post-detail': Stub,
      'user-profile': Stub,
      friends: Stub,
      'post-composer': Stub,
    },
    { initialUrl },
  );
}

describe('/edit-profile rotası', () => {
  it('Profil ekranındaki satırla açılır; kaydedince geri döner ve Profil güncel adı gösterir', async () => {
    const services = createMockServices({ signedIn: true });
    const app = renderApp(services);
    await app;
    expect(await screen.findByRole('header', { name: 'Elif' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: edit.open }));
    expect(await screen.findByRole('header', { name: edit.title })).toBeTruthy();
    expect(app.getPathname()).toBe('/edit-profile');

    await fireEvent.changeText(screen.getByLabelText(edit.name), 'Ayşe');
    await fireEvent.press(screen.getByRole('button', { name: edit.save }));

    await waitFor(() => expect(app.getPathname()).toBe('/profile'));
    expect(await screen.findByRole('header', { name: 'Ayşe' })).toBeTruthy();
    expect(screen.queryByRole('header', { name: 'Elif' })).toBeNull();
    expect(screen.getByText('A', { includeHiddenElements: true })).toBeTruthy();
    // Üyelik satırı profilin joinedAt alanından gelmeye devam eder.
    expect(screen.getByText("Ağustos 2026'dan beri")).toBeTruthy();
  });

  it('oturum yokken derin bağlantı karşılamaya düşer', async () => {
    await renderApp(createMockServices(), '/edit-profile');
    expect(await screen.findByText('Her 20 km, gerçek bir ağaç.')).toBeTruthy();
    expect(screen.queryByLabelText(edit.name)).toBeNull();
  });

  it('Vazgeç değişiklik yokken Profil ekranına döner', async () => {
    const app = renderApp(createMockServices({ signedIn: true }));
    await app;
    await fireEvent.press(await screen.findByRole('button', { name: edit.open }));
    await fireEvent.press(await screen.findByRole('button', { name: edit.cancel }));

    await waitFor(() => expect(app.getPathname()).toBe('/profile'));
    expect(await screen.findByRole('header', { name: 'Elif' })).toBeTruthy();
  });
});

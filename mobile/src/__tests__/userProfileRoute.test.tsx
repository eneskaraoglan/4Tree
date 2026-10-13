import { renderRouter, screen } from 'expo-router/testing-library';

import * as AuthLayout from '@/app/(auth)/_layout';
import WelcomeRoute from '@/app/(auth)/welcome';
import TabsLayout from '@/app/(tabs)/_layout';
import FeedRoute from '@/app/(tabs)/feed';
import PostDetailRoute from '@/app/post-detail';
import UserProfileRoute from '@/app/user-profile';
import RootLayout from '@/app/_layout';
import { profileTr } from '@/i18n';
import { createMockServices, ServicesProvider, type Services } from '@/services';

jest.mock('react-native-reanimated', () => {
  const mock = jest.requireActual('@/components/illustration/reanimatedTestMock').createReanimatedMock();
  const cancelAnimation = jest.fn();
  return { ...mock, cancelAnimation, default: { ...mock.default, cancelAnimation } };
});
jest.mock('react-native-reanimated/mock', () => {
  const mock = jest.requireActual('@/components/illustration/reanimatedTestMock').createReanimatedMock();
  const cancelAnimation = jest.fn();
  return { ...mock, cancelAnimation, default: { ...mock.default, cancelAnimation } };
});
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('@/theme/useAppFonts', () => ({ useAppFonts: () => true }));
jest.mock('@/components/RouteLine', () => ({ RouteLine: () => null }));

const Stub = () => null;

function renderApp(services: Services, initialUrl = '/user-profile?userId=user-mert') {
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
      '(tabs)/feed': FeedRoute,
      '(tabs)/index': Stub,
      '(tabs)/forest': Stub,
      '(tabs)/achievements': Stub,
      '(tabs)/profile': Stub,
      'post-detail': PostDetailRoute,
      'user-profile': UserProfileRoute,
      activity: Stub,
      'edit-profile': Stub,
      friends: Stub,
      'post-composer': Stub,
    },
    { initialUrl },
  );
}

describe('/user-profile rotası', () => {
  it('oturum açıkken kullanıcı profili ekranını gösterir', async () => {
    const services = createMockServices({ signedIn: true });
    const app = renderApp(services, '/user-profile?userId=user-mert');
    await app;

    expect(await screen.findByRole('header', { name: profileTr.userProfile.title })).toBeTruthy();
    expect(await screen.findByTestId('user-profile-name')).toHaveTextContent('Mert');
    expect(app.getPathname()).toBe('/user-profile');
  });

  it('oturum yokken karşılama ekranına yönlendirir', async () => {
    await renderApp(createMockServices());
    expect(await screen.findByText('Her 20 km, gerçek bir ağaç.')).toBeTruthy();
  });
});

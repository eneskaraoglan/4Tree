import { renderRouter, screen } from 'expo-router/testing-library';

import * as AuthLayout from '@/app/(auth)/_layout';
import WelcomeRoute from '@/app/(auth)/welcome';
import TabsLayout from '@/app/(tabs)/_layout';
import FeedRoute from '@/app/(tabs)/feed';
import FriendsRoute from '@/app/friends';
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

function renderApp(services: Services, initialUrl = '/friends') {
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
      friends: FriendsRoute,
      activity: Stub,
      'edit-profile': Stub,
      'post-composer': Stub,
    },
    { initialUrl },
  );
}

describe('/friends rotası', () => {
  it('oturum açıkken arkadaşlar ekranını gösterir', async () => {
    const services = createMockServices({ signedIn: true });
    const app = renderApp(services, '/friends');
    await app;

    expect(await screen.findByRole('header', { name: profileTr.friends.title })).toBeTruthy();
    expect(await screen.findByText('Mert')).toBeTruthy();
    expect(app.getPathname()).toBe('/friends');
  });

  it('oturum yokken karşılama ekranına yönlendirir', async () => {
    await renderApp(createMockServices());
    expect(await screen.findByText('Her 20 km, gerçek bir ağaç.')).toBeTruthy();
  });
});

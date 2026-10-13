import { renderRouter, screen } from 'expo-router/testing-library';

import * as AuthLayout from '@/app/(auth)/_layout';
import WelcomeRoute from '@/app/(auth)/welcome';
import TabsLayout from '@/app/(tabs)/_layout';
import FeedRoute from '@/app/(tabs)/feed';
import PostComposerRoute from '@/app/post-composer';
import RootLayout from '@/app/_layout';
import { trFeed } from '@/i18n';
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

function renderApp(services: Services, initialUrl = '/post-composer') {
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
      '(tabs)/index': Stub,
      '(tabs)/forest': Stub,
      '(tabs)/achievements': Stub,
      '(tabs)/feed': FeedRoute,
      '(tabs)/profile': Stub,
      activity: Stub,
      'edit-profile': Stub,
      'post-detail': Stub,
      'user-profile': Stub,
      friends: Stub,
      'post-composer': PostComposerRoute,
    },
    { initialUrl },
  );
}

describe('/post-composer rotası', () => {
  it('oturum açıkken gönderi oluşturucu ekranını ve başlığını gösterir', async () => {
    const services = createMockServices({ signedIn: true });
    const app = renderApp(services);
    await app;

    expect(await screen.findByRole('header', { name: trFeed.composer.title })).toBeTruthy();
    expect(screen.getByTestId('composer-caption-input')).toBeTruthy();
    expect(app.getPathname()).toBe('/post-composer');
  });

  it('oturum yokken karşılama ekranına yönlendirir', async () => {
    await renderApp(createMockServices());
    expect(await screen.findByText('Her 20 km, gerçek bir ağaç.')).toBeTruthy();
  });
});

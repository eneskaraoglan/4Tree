import { renderRouter, screen } from 'expo-router/testing-library';

import ActivityRoute from '@/app/activity';
import { createTestEnvironment, TestEnvironment } from '@/features/activity/testing';
import { ServicesProvider, createMockServices } from '@/services';

// expo-router/testing-library kendi Reanimated sahtesini `react-native-reanimated/mock` ile kurar ve bizimkini ezer;
// ikisi de bizim sahteye yönlendirilir.
jest.mock('react-native-reanimated', () =>
  jest.requireActual('../components/illustration/reanimatedTestMock').createReanimatedMock(),
);
jest.mock('react-native-reanimated/mock', () =>
  jest.requireActual('../components/illustration/reanimatedTestMock').createReanimatedMock(),
);
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));

// Ortam ve servisler her testte bir kez kurulur (render başına yeniden üretilirse takip/taslak durumu kaybolur).
let env: ReturnType<typeof createTestEnvironment>;
let services: ReturnType<typeof createMockServices>;
beforeEach(() => {
  env = createTestEnvironment();
  services = createMockServices();
});

function Wrapped() {
  return (
    <ServicesProvider services={services}>
      <TestEnvironment environment={env.environment}>
        <ActivityRoute />
      </TestEnvironment>
    </ServicesProvider>
  );
}

describe('/activity rotası', () => {
  it('rota olarak açılır ve aktif aktivite ekranını gösterir', async () => {
    await renderRouter({ index: () => null, activity: Wrapped }, { initialUrl: '/activity' });
    expect(await screen.findByLabelText('Aktif aktivite')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Duraklat' })).toBeTruthy();
  });

  it('mode=resume ile taslak yoksa anlaşılır mesaj gösterir', async () => {
    await renderRouter({ index: () => null, activity: Wrapped }, { initialUrl: '/activity?mode=resume' });
    expect(await screen.findByText('Yarım kalan aktivite bulunamadı.')).toBeTruthy();
  });
});

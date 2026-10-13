import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, findNodeHandle, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createMockServices } from '@/services';
import type { Badge } from '@/types';

import { StampSheet } from './StampSheet';

jest.mock('react-native-reanimated', () => jest.requireActual('../../components/illustration/reanimatedTestMock').createReanimatedMock());
jest.mock('react-native/Libraries/ReactNative/RendererProxy', () => ({
  ...jest.requireActual('react-native/Libraries/ReactNative/RendererProxy'),
  findNodeHandle: jest.fn(),
}));

const originalOS = Platform.OS;
function setOS(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
}

async function firstBadge(): Promise<Badge> {
  const [badge] = await createMockServices().badge.getBadges();
  return badge;
}

async function renderSheet(badge: Badge, onClose = jest.fn()) {
  await render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
      <StampSheet badge={badge} visible onClose={onClose} />
    </SafeAreaProvider>,
  );
  return onClose;
}

afterEach(() => {
  setOS(originalOS);
  jest.restoreAllMocks();
});

describe('StampSheet (gerçek odak yardımcısı)', () => {
  it('web: açılır, odak gecikmesi dolunca çökmez, findNodeHandle çağrılmaz, Kapat çalışır', async () => {
    setOS('web');
    expect(jest.isMockFunction(findNodeHandle)).toBe(true);
    (findNodeHandle as jest.Mock).mockClear();
    const sendEvent = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockImplementation(() => undefined);
    const setFocus = jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => undefined);
    sendEvent.mockClear();
    setFocus.mockClear();

    const onClose = await renderSheet(await firstBadge());
    expect(screen.getByTestId('stamp-sheet')).toBeTruthy();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Kapat' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(findNodeHandle).not.toHaveBeenCalled();
    expect(setFocus).not.toHaveBeenCalled();
    expect(sendEvent).not.toHaveBeenCalled();
  });

  it('native: odak gecikmesi dolunca sendAccessibilityEvent(ref, "focus") çağrılır', async () => {
    setOS('ios');
    const sendEvent = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockImplementation(() => undefined);
    sendEvent.mockClear();

    await renderSheet(await firstBadge());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });

    expect(sendEvent).toHaveBeenCalledWith(expect.anything(), 'focus');
  });
});

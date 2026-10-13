import { AccessibilityInfo, findNodeHandle, Platform } from 'react-native';

import { focusAccessibility } from './accessibilityFocus';

jest.mock('react-native/Libraries/ReactNative/RendererProxy', () => ({
  ...jest.requireActual('react-native/Libraries/ReactNative/RendererProxy'),
  findNodeHandle: jest.fn(),
}));

const originalOS = Platform.OS;
function setOS(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
}

let sendEvent: jest.SpyInstance;
let setFocus: jest.SpyInstance;

beforeEach(() => {
  sendEvent = jest.spyOn(AccessibilityInfo, 'sendAccessibilityEvent').mockImplementation(() => undefined);
  setFocus = jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => undefined);
  sendEvent.mockClear();
  setFocus.mockClear();
  (findNodeHandle as jest.Mock).mockClear();
});

afterEach(() => {
  setOS(originalOS);
  jest.restoreAllMocks();
});

describe('focusAccessibility', () => {
  it('findNodeHandle sahtesi gerçekten bağlı (aşağıdaki "çağrılmaz" doğrulamaları anlamlı)', () => {
    expect(jest.isMockFunction(findNodeHandle)).toBe(true);
  });

  it('web: findNodeHandle çağrılmaz; DOM öğesine tabindex=-1 verip focus() çağırır', () => {
    setOS('web');
    const el = { focus: jest.fn(), hasAttribute: jest.fn(() => false), setAttribute: jest.fn() };

    focusAccessibility(el);

    expect(findNodeHandle).not.toHaveBeenCalled();
    expect(sendEvent).not.toHaveBeenCalled();
    expect(setFocus).not.toHaveBeenCalled();
    expect(el.setAttribute).toHaveBeenCalledWith('tabindex', '-1');
    expect(el.focus).toHaveBeenCalledTimes(1);
    expect(el.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('web: tabindex zaten varsa dokunmaz; focus() olmayan öğede hata vermez', () => {
    setOS('web');
    const el = { focus: jest.fn(), hasAttribute: jest.fn(() => true), setAttribute: jest.fn() };

    focusAccessibility(el);
    expect(el.setAttribute).not.toHaveBeenCalled();
    expect(el.focus).toHaveBeenCalledTimes(1);

    expect(() => focusAccessibility({})).not.toThrow();
    expect(findNodeHandle).not.toHaveBeenCalled();
  });

  it.each(['ios', 'android'] as const)('%s: AccessibilityInfo.sendAccessibilityEvent(ref, "focus") çağrılır', (os) => {
    setOS(os);
    const ref = { id: 'host' };

    focusAccessibility(ref);

    expect(sendEvent).toHaveBeenCalledWith(ref, 'focus');
    expect(setFocus).not.toHaveBeenCalled();
  });

  it.each(['web', 'ios', 'android'] as const)('%s: null ve undefined ref güvenlidir', (os) => {
    setOS(os);

    expect(() => {
      focusAccessibility(null);
      focusAccessibility(undefined);
    }).not.toThrow();
    expect(sendEvent).not.toHaveBeenCalled();
    expect(findNodeHandle).not.toHaveBeenCalled();
  });
});

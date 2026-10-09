import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { setReducedMotion } from '@/components/illustration/reanimatedTestMock';
import { createMockServices, ServicesProvider, type MockScenario, type Services } from '@/services';

import { RunScreen } from './RunScreen';

jest.mock('react-native-reanimated', () =>
  jest.requireActual('../../components/illustration/reanimatedTestMock').createReanimatedMock(),
);
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Heavy: 'heavy' },
}));
// Gerçek useFocusEffect bir navigator ister; burada odaklanma, elle tetiklenebilen bir geri çağırmadır.
let mockFocusCallback: (() => void) | undefined;
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useEffect } = require('react');
    useEffect(() => {
      mockFocusCallback = callback;
      callback();
    }, [callback]);
  },
}));

/** Son mock aktivite 2026-10-09 06:40 (+03:00); "şimdi" ondan tam 1 gün sonrası, yani "dün". */
const NOW = new Date(new Date('2026-10-09T06:40:00+03:00').getTime() + 24 * 3600 * 1000);

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

type Options = { onStart?: jest.Mock; now?: Date; latencyMs?: number; services?: Services };

async function renderRun(scenario: MockScenario = 'default', options: Options = {}) {
  const services = options.services ?? createMockServices({ scenario, latencyMs: options.latencyMs });
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ServicesProvider services={services}>
        <RunScreen now={'now' in options ? options.now : NOW} onStart={options.onStart} />
      </ServicesProvider>
    </SafeAreaProvider>,
  );
}

const HIDDEN = { includeHiddenElements: true } as const;

describe('RunScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setReducedMotion(false);
  });

  it('yüklenirken iskelet gösterir (veri yok), veri gelince doldurur', async () => {
    await renderRun('default', { latencyMs: 40 });

    expect(screen.getByLabelText('Yükleniyor')).toBeTruthy();
    expect(screen.queryByRole('header')).toBeNull();
    expect(screen.queryByText('Ağacına 12,4 km kaldı.')).toBeNull();
    expect(screen.queryByText('Son koşun')).toBeNull();
    // Başla veriden bağımsız, yükleme sırasında da hazır.
    expect(screen.getByRole('button', { name: 'Koşuyu başlat' })).toBeTruthy();

    expect(await screen.findByText('Ağacına 12,4 km kaldı.')).toBeTruthy();
    expect(screen.queryByLabelText('Yükleniyor')).toBeNull();
  });

  it('varsayılan senaryoda selam, halka sayısı, kalan km ve son koşuyu gösterir', async () => {
    await renderRun();

    expect(await screen.findByRole('header', { name: /^(Günaydın|İyi günler|İyi akşamlar), Elif$/ })).toBeTruthy();
    expect(screen.getByLabelText('7,6', HIDDEN)).toBeTruthy();
    expect(screen.getByText('/ 20 km', HIDDEN)).toBeTruthy();
    expect(screen.getByText('Ağacına 12,4 km kaldı.')).toBeTruthy();
    expect(screen.getByLabelText('Bu ağaç için 7,6 km yapıldı, 12,4 km kaldı')).toBeTruthy();

    expect(screen.getByText('Son koşun')).toBeTruthy();
    expect(screen.getByText('6,2 km · 36 dk')).toBeTruthy();
    expect(screen.getByText('dün')).toBeTruthy();
  });

  it('halkanın merkezindeki sayılar ekran okuyucudan gizlidir (etiket zaten söylüyor)', async () => {
    await renderRun();
    await screen.findByText('Ağacına 12,4 km kaldı.');

    expect(screen.queryByLabelText('7,6')).toBeNull();
    expect(screen.queryByText('/ 20 km')).toBeNull();
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
  });

  it('saate göre selam verir', async () => {
    await renderRun('default', { now: new Date(2026, 9, 10, 8, 0) });
    expect(await screen.findByRole('header', { name: 'Günaydın, Elif' })).toBeTruthy();
  });

  it('öğleden sonra "İyi günler" der', async () => {
    await renderRun('default', { now: new Date(2026, 9, 10, 14, 0) });
    expect(await screen.findByRole('header', { name: 'İyi günler, Elif' })).toBeTruthy();
  });

  it('Reduce Motion açıkken de aynı içeriği gösterir', async () => {
    setReducedMotion(true);
    await renderRun();
    expect(await screen.findByText('Ağacına 12,4 km kaldı.')).toBeTruthy();
  });

  it('yeni kullanıcıda halka boş, sonraki adımı söyler', async () => {
    await renderRun('empty');

    expect(await screen.findByText("Henüz ağacın yok, ilk 20 km'yi bekliyor.")).toBeTruthy();
    expect(screen.getByLabelText('0,0', HIDDEN)).toBeTruthy();
    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(0);
    expect(screen.getByText('Bugün ilk koşun, başlayalım mı?')).toBeTruthy();
    expect(screen.queryByText('Son koşun')).toBeNull();
  });

  it('hata senaryosunda mesaj ve "Tekrar dene" gösterir, halka erişilebilirlikten gizlidir', async () => {
    await renderRun('error');

    expect(await screen.findByText('Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.')).toBeTruthy();
    expect(screen.queryByText('Ağacına 12,4 km kaldı.')).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByRole('progressbar', HIDDEN)).toBeTruthy();
  });

  it('"Tekrar dene" yeniden yükler; başarılı olunca veriyi gösterir', async () => {
    const healthy = createMockServices();
    let failing = true;
    const services: Services = {
      ...healthy,
      profile: {
        ...healthy.profile,
        getProfile: () => (failing ? Promise.reject(new Error('boom')) : healthy.profile.getProfile()),
      },
    };
    await renderRun('default', { services });
    // ServiceError olmayan hata genel mesaja döner.
    expect(await screen.findByText('Bir şeyler ters gitti. Tekrar dene.')).toBeTruthy();

    failing = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));
    expect(await screen.findByText('Ağacına 12,4 km kaldı.')).toBeTruthy();
  });

  it('sekmeler seçili durumu taşır, değişince Light haptic verir ve içeriği değiştirir', async () => {
    await renderRun();
    await screen.findByText('Son koşun');

    expect(screen.getByRole('tab', { name: 'Koşu' }).props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByRole('tab', { name: 'Yürüyüş' }).props.accessibilityState).toMatchObject({ selected: false });

    // Aktif sekmeye tekrar basmak haptic vermez.
    await fireEvent.press(screen.getByRole('tab', { name: 'Koşu' }));
    expect(Haptics.impactAsync).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('tab', { name: 'Yürüyüş' }));
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
    expect(screen.getByRole('tab', { name: 'Yürüyüş' }).props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByText('Son yürüyüşün')).toBeTruthy();
    expect(screen.getByText('9,8 km · 1 sa 58 dk')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Yürüyüşü başlat' })).toBeTruthy();
  });

  it('Yürüyüş sekmesinde yürüyüş yoksa sonraki adımı söyler', async () => {
    const base = createMockServices();
    const services: Services = {
      ...base,
      activity: {
        ...base.activity,
        getActivities: async () => (await base.activity.getActivities()).filter((a) => a.type === 'run'),
      },
    };
    await renderRun('default', { services });
    await screen.findByText('Son koşun');

    await fireEvent.press(screen.getByRole('tab', { name: 'Yürüyüş' }));

    expect(screen.getByText('Bugün ilk yürüyüşün, başlayalım mı?')).toBeTruthy();
    expect(screen.queryByText('Son yürüyüşün')).toBeNull();
  });

  it('Başla basınca Heavy haptic verir ve onStart çağrılır', async () => {
    const onStart = jest.fn();
    await renderRun('default', { onStart });
    await screen.findByText('Son koşun');

    await fireEvent.press(screen.getByRole('button', { name: 'Koşuyu başlat' }));

    expect(Haptics.impactAsync).toHaveBeenCalledWith('heavy');
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith('run');
  });

  it('hata durumunda da Başla basılabilir', async () => {
    const onStart = jest.fn();
    await renderRun('error', { onStart });
    await fireEvent.press(screen.getByRole('button', { name: 'Koşuyu başlat' }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});

describe('RunScreen yenileme', () => {
  let appStateHandler: ((state: string) => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    appStateHandler = undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, handler: (state: string) => void) => {
      appStateHandler = handler;
      return { remove: jest.fn() };
    }) as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  function countingServices() {
    const base = createMockServices();
    const getProfile = jest.fn(base.profile.getProfile);
    return { services: { ...base, profile: { ...base.profile, getProfile } } as Services, getProfile };
  }

  it('odaklanınca veri sessizce yenilenir: ekran yükleniyor durumuna düşmez', async () => {
    const { services, getProfile } = countingServices();
    await renderRun('default', { services });
    await screen.findByText('Ağacına 12,4 km kaldı.');
    const callsAfterFirstLoad = getProfile.mock.calls.length;

    await act(async () => mockFocusCallback?.());

    expect(screen.queryByLabelText('Yükleniyor')).toBeNull();
    expect(screen.getByText('Ağacına 12,4 km kaldı.')).toBeTruthy();
    expect(getProfile.mock.calls.length).toBe(callsAfterFirstLoad + 1);
  });

  it('uygulama öne gelince (active) saat tazelenir; now verilmişse sabit kalır', async () => {
    jest.useFakeTimers({
      now: new Date(2026, 9, 10, 8, 0),
      doNotFake: [
        'nextTick', 'queueMicrotask', 'setImmediate', 'clearImmediate',
        'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
        'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback',
        'hrtime', 'performance',
      ],
    });
    await renderRun('default', { now: undefined });
    expect(await screen.findByRole('header', { name: 'Günaydın, Elif' })).toBeTruthy();

    jest.setSystemTime(new Date(2026, 9, 10, 20, 0));
    await act(async () => appStateHandler?.('background'));
    expect(screen.getByRole('header', { name: 'Günaydın, Elif' })).toBeTruthy();
    await act(async () => appStateHandler?.('active'));
    expect(screen.getByRole('header', { name: 'İyi akşamlar, Elif' })).toBeTruthy();
  });

  it('now prop verilmişse odaklanınca da selam değişmez', async () => {
    await renderRun('default', { now: new Date(2026, 9, 10, 8, 0) });
    await screen.findByRole('header', { name: 'Günaydın, Elif' });

    await act(async () => appStateHandler?.('active'));
    await act(async () => mockFocusCallback?.());

    expect(screen.getByRole('header', { name: 'Günaydın, Elif' })).toBeTruthy();
  });
});

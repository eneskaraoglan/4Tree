import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { Alert, AppState, Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { setReducedMotion } from '@/components/illustration/reanimatedTestMock';
import { createTestEnvironment, TestEnvironment } from '@/features/activity/testing';
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
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
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

type Options = {
  now?: Date;
  latencyMs?: number;
  services?: Services;
  env?: ReturnType<typeof createTestEnvironment>;
};

async function renderRun(scenario: MockScenario = 'default', options: Options = {}) {
  const services = options.services ?? createMockServices({ scenario, latencyMs: options.latencyMs });
  const env = options.env ?? createTestEnvironment();
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ServicesProvider services={services}>
        <TestEnvironment environment={env.environment}>
          <RunScreen now={'now' in options ? options.now : NOW} />
        </TestEnvironment>
      </ServicesProvider>
    </SafeAreaProvider>,
  );
  return env;
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
    expect(screen.queryByText('Son aktiviten')).toBeNull();
    // Başla veriden bağımsız, yükleme sırasında da hazır.
    expect(screen.getByRole('button', { name: 'Aktiviteyi başlat' })).toBeTruthy();

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

    expect(screen.getByText('Son aktiviten')).toBeTruthy();
    expect(screen.getByText('Koşu · 6,2 km · 36 dk')).toBeTruthy();
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
    expect(screen.getByText('Bugün ilk aktiviten, başlayalım mı?')).toBeTruthy();
    expect(screen.queryByText('Son aktiviten')).toBeNull();
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

  it('Koşu|Yürüyüş sekmeleri kalktı: tek Başla var', async () => {
    await renderRun();
    await screen.findByText('Son aktiviten');

    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.queryByText('Yürüyüş')).toBeNull();
    expect(screen.getAllByRole('button', { name: /başlat/i })).toHaveLength(1);
    expect(screen.getByText('Başla')).toBeTruthy();
  });

  it('"Son aktiviten" etiketi sonucun türünden gelir: yürüyüş de gösterilir', async () => {
    const base = createMockServices();
    const services: Services = {
      ...base,
      activity: {
        ...base.activity,
        getActivities: async () => (await base.activity.getActivities()).filter((a) => a.type === 'walk'),
      },
    };
    await renderRun('default', { services });

    expect(await screen.findByText('Yürüyüş · 9,8 km · 1 sa 58 dk')).toBeTruthy();
    expect(screen.getByText('Son aktiviten')).toBeTruthy();
  });

  it('hata durumunda da Başla basılabilir', async () => {
    await renderRun('error');
    await fireEvent.press(screen.getByRole('button', { name: 'Aktiviteyi başlat' }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/activity'));
  });
});

describe('RunScreen: Başla ve konum izni', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setReducedMotion(false);
  });

  it('izin zaten varsa Heavy haptic verir ve /activity rotasına gider', async () => {
    await renderRun();
    await screen.findByText('Son aktiviten');

    await fireEvent.press(screen.getByRole('button', { name: 'Aktiviteyi başlat' }));

    expect(Haptics.impactAsync).toHaveBeenCalledWith('heavy');
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/activity'));
    expect(screen.queryByText('Konumunu neden istiyoruz?')).toBeNull();
  });

  it('çift Başla: navigasyon tek sefer yapılır; ana ekran yeniden odaklanınca kilit açılır', async () => {
    await renderRun();
    await screen.findByText('Son aktiviten');
    const start = screen.getByRole('button', { name: 'Aktiviteyi başlat' });

    await fireEvent.press(start);
    await fireEvent.press(start);
    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
    await fireEvent.press(start);
    expect(mockPush).toHaveBeenCalledTimes(1);

    // Aktivite ekranından dönüş: odak geri gelir, tekrar başlatılabilir.
    await act(async () => mockFocusCallback?.());
    await fireEvent.press(screen.getByRole('button', { name: 'Aktiviteyi başlat' }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(2));
  });

  it('açılışta yetim arka plan görevini temizletir', async () => {
    const env = await renderRun();
    await screen.findByText('Son aktiviten');
    expect(env.locationSource.orphanStops).toBe(1);
  });

  it('izin sorulmadıysa önce nedenini açıklar; "İzin ver" sistemden ister ve verilince rotaya gider', async () => {
    const env = await renderRun('default', { env: createTestEnvironment({ permission: 'undetermined' }) });
    await screen.findByText('Son aktiviten');

    await fireEvent.press(screen.getByRole('button', { name: 'Aktiviteyi başlat' }));
    expect(await screen.findByText('Konumunu neden istiyoruz?')).toBeTruthy();
    expect(screen.getByText(/Rotanı çizmek ve kat ettiğin mesafeyi doğru ölçmek/)).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
    expect(env.locationSource.requestCalls).toBe(0);

    await fireEvent.press(screen.getByRole('button', { name: 'İzin ver' }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/activity'));
    expect(env.locationSource.requestCalls).toBe(1);
    expect(screen.queryByText('Konumunu neden istiyoruz?')).toBeNull();
  });

  it('"Şimdi değil" paneli kapatır, rotaya gitmez', async () => {
    await renderRun('default', { env: createTestEnvironment({ permission: 'undetermined' }) });
    await screen.findByText('Son aktiviten');
    await fireEvent.press(screen.getByRole('button', { name: 'Aktiviteyi başlat' }));
    await screen.findByText('Konumunu neden istiyoruz?');

    await fireEvent.press(screen.getByRole('button', { name: 'Şimdi değil' }));

    expect(screen.queryByText('Konumunu neden istiyoruz?')).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('izin reddedilirse anlaşılır durum gösterir ve "Ayarları aç" ayarlara götürür', async () => {
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    const env = createTestEnvironment({ permission: 'undetermined' });
    env.locationSource.nextRequestResult = 'blocked';
    await renderRun('default', { env });
    await screen.findByText('Son aktiviten');

    await fireEvent.press(screen.getByRole('button', { name: 'Aktiviteyi başlat' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'İzin ver' }));

    expect(await screen.findByText('Konum izni kapalı')).toBeTruthy();
    expect(screen.getByText(/Konum izni olmadan aktiviteni kaydedemeyiz/)).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Ayarları aç' }));
    expect(openSettings).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Konum izni kapalı')).toBeNull();
  });

  it('izin daha önce kalıcı reddedildiyse doğrudan ret durumunu gösterir', async () => {
    const env = await renderRun('default', { env: createTestEnvironment({ permission: 'blocked' }) });
    await screen.findByText('Son aktiviten');

    await fireEvent.press(screen.getByRole('button', { name: 'Aktiviteyi başlat' }));

    expect(await screen.findByText('Konum izni kapalı')).toBeTruthy();
    expect(env.locationSource.requestCalls).toBe(0);
    await fireEvent.press(screen.getByRole('button', { name: 'Tamam' }));
    expect(screen.queryByText('Konum izni kapalı')).toBeNull();
  });

  it('izin isteği hata verirse açıklama açık kalır ve tekrar denenebilir', async () => {
    const env = createTestEnvironment({ permission: 'undetermined' });
    jest.spyOn(env.locationSource, 'requestPermission').mockRejectedValueOnce(new Error('sistem'));
    await renderRun('default', { env });
    await screen.findByText('Son aktiviten');

    await fireEvent.press(screen.getByRole('button', { name: 'Aktiviteyi başlat' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'İzin ver' }));
    expect(await screen.findByText('İzin istenirken bir sorun çıktı. Tekrar dene.')).toBeTruthy();
    expect(screen.getByText('Konumunu neden istiyoruz?')).toBeTruthy();
  });
});

describe('RunScreen: yarım kalan aktivite', () => {
  const draft = {
    v: 1 as const,
    startedAt: 1_700_000_000_000,
    activeMs: 1_440_000,
    distanceM: 3200,
    segment: 0,
    points: [{ lat: 41, lng: 29, t: 1_700_000_001_000, seg: 0 }],
    savedAt: 1_700_001_440_000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setReducedMotion(false);
  });

  async function renderWithDraft() {
    const env = createTestEnvironment();
    await env.environment.drafts.save(draft, null);
    await renderRun('default', { env });
    await screen.findByText('Yarım kalan aktivite var');
    return env;
  }

  it('taslak varsa Başla yerine devam et / kaydet / sil sunar', async () => {
    await renderWithDraft();

    expect(screen.getByText('3,2 km · 24 dk')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Devam et' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Kaydet' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sil' })).toBeTruthy();
    // Taslak üzerine yazılmasın: yeni kayıt başlatılamaz.
    expect(screen.queryByRole('button', { name: 'Aktiviteyi başlat' })).toBeNull();
  });

  it('Devam et ve Kaydet doğru modla /activity rotasına gider', async () => {
    await renderWithDraft();

    await fireEvent.press(screen.getByRole('button', { name: 'Devam et' }));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/activity', params: { mode: 'resume' } });

    // Navigasyon sürerken ikinci dokunuş yok sayılır; ana ekran yeniden odaklanınca kilit açılır.
    await fireEvent.press(screen.getByRole('button', { name: 'Kaydet' }));
    expect(mockPush).toHaveBeenCalledTimes(1);
    await act(async () => mockFocusCallback?.());
    await fireEvent.press(screen.getByRole('button', { name: 'Kaydet' }));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/activity', params: { mode: 'finish' } });
  });

  it('Sil onay ister; onaylanınca taslak silinir ve Başla geri gelir', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const env = await renderWithDraft();

    await fireEvent.press(screen.getByRole('button', { name: 'Sil' }));
    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert.mock.calls[0][0]).toBe('Yarım kalan aktivite silinsin mi?');
    expect(screen.getByText('Yarım kalan aktivite var')).toBeTruthy();

    const destructive = (alert.mock.calls[0][2] ?? []).find((b) => b.text === 'Sil');
    await act(async () => destructive?.onPress?.());

    expect(await screen.findByRole('button', { name: 'Aktiviteyi başlat' })).toBeTruthy();
    expect(screen.queryByText('Yarım kalan aktivite var')).toBeNull();
    expect(await env.environment.drafts.load(null)).toBeNull();
  });
});

describe('RunScreen: bekleyen (offline) aktiviteler', () => {
  const input = {
    type: 'run' as const,
    durationSec: 1800,
    startedAt: '2026-10-10T07:00:00.000Z',
    distanceKm: 5.2,
    route: [
      { lat: 41, lng: 29 },
      { lat: 41.01, lng: 29 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setReducedMotion(false);
  });

  function offlineServices(online: { value: boolean }) {
    const base = createMockServices();
    const saveActivity = jest.fn((activity: Parameters<Services['activity']['saveActivity']>[0]) =>
      online.value ? base.activity.saveActivity(activity) : Promise.reject(new Error('ağ yok')),
    );
    return { services: { ...base, activity: { ...base.activity, saveActivity } } as Services, saveActivity };
  }

  it('bağlantı yokken kuyruktaki aktiviteyi "bağlantı gelince gönderilecek" diye gösterir', async () => {
    const env = createTestEnvironment();
    await env.environment.queue.enqueue('local-1', input, null);
    const { services } = offlineServices({ value: false });
    await renderRun('default', { env, services });

    expect(await screen.findByText('Bir aktiviten bağlantı gelince gönderilecek.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Şimdi gönder' })).toBeTruthy();
    // Açılışta otomatik deneme sessizdir: hata mesajı yok.
    expect(screen.queryByText('Gönderilemedi, bağlantı gelince yine denenecek.')).toBeNull();
  });

  it('"Şimdi gönder" bağlantı yokken hata gösterir, kayıt kuyrukta kalır', async () => {
    const env = createTestEnvironment();
    await env.environment.queue.enqueue('local-1', input, null);
    const { services, saveActivity } = offlineServices({ value: false });
    await renderRun('default', { env, services });
    await screen.findByText('Bir aktiviten bağlantı gelince gönderilecek.');
    saveActivity.mockClear();

    await fireEvent.press(screen.getByRole('button', { name: 'Şimdi gönder' }));

    expect(await screen.findByText('Gönderilemedi, bağlantı gelince yine denenecek.')).toBeTruthy();
    expect(saveActivity).toHaveBeenCalledTimes(1);
    expect(await env.environment.queue.list(null)).toHaveLength(1);
  });

  it('bağlantı gelince "Şimdi gönder" gönderir, gösterge kalkar ve son aktivite tazelenir', async () => {
    const env = createTestEnvironment();
    await env.environment.queue.enqueue('local-1', input, null);
    await env.environment.queue.enqueue('local-2', { ...input, startedAt: '2026-10-10T09:00:00.000Z' }, null);
    const online = { value: false };
    const { services, saveActivity } = offlineServices(online);
    await renderRun('default', { env, services });
    expect(await screen.findByText('2 aktiviten bağlantı gelince gönderilecek.')).toBeTruthy();
    saveActivity.mockClear();

    online.value = true;
    await fireEvent.press(screen.getByRole('button', { name: 'Şimdi gönder' }));

    await waitFor(() => expect(screen.queryByText(/bağlantı gelince gönderilecek/)).toBeNull());
    expect(saveActivity).toHaveBeenCalledTimes(2);
    expect(await env.environment.queue.list(null)).toEqual([]);
  });

  it('açılışta/odakta otomatik yeniden dener: bağlantı varsa kuyruk kendiliğinden boşalır', async () => {
    const env = createTestEnvironment();
    await env.environment.queue.enqueue('local-1', input, null);
    const { services, saveActivity } = offlineServices({ value: true });
    await renderRun('default', { env, services });

    await waitFor(() => expect(saveActivity).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText(/bağlantı gelince gönderilecek/)).toBeNull());
    expect(await env.environment.queue.list(null)).toEqual([]);
  });

  it('birkaç denemeden sonra da gönderilemeyenleri ayrı gösterir: yeniden dene gönderir', async () => {
    const env = createTestEnvironment();
    await env.environment.queue.enqueue('local-1', input, null);
    const stored = JSON.parse((await env.storage.getItem('@4tree/activity-queue/v1')) as string);
    stored[0].attempts = 5;
    await env.storage.setItem('@4tree/activity-queue/v1', JSON.stringify(stored));
    const { services, saveActivity } = offlineServices({ value: true });
    await renderRun('default', { env, services });

    expect(await screen.findByText('Bir aktivite gönderilemedi.')).toBeTruthy();
    // Otomatik denemeler "gönderilemedi" girişine dokunmaz.
    expect(saveActivity).not.toHaveBeenCalled();
    expect(screen.queryByText(/bağlantı gelince gönderilecek/)).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Yeniden dene' }));
    await waitFor(() => expect(saveActivity).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText('Bir aktivite gönderilemedi.')).toBeNull());
    expect(await env.environment.queue.list(null)).toEqual([]);
  });

  it('"gönderilemedi" girişleri onayla silinir', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const env = createTestEnvironment();
    await env.environment.queue.enqueue('local-1', input, null);
    const stored = JSON.parse((await env.storage.getItem('@4tree/activity-queue/v1')) as string);
    stored[0].attempts = 5;
    await env.storage.setItem('@4tree/activity-queue/v1', JSON.stringify(stored));
    await renderRun('default', { env });
    await screen.findByText('Bir aktivite gönderilemedi.');

    await fireEvent.press(screen.getByRole('button', { name: 'Sil' }));
    expect(alert.mock.calls[0][0]).toBe('Gönderilemeyen aktiviteler silinsin mi?');
    expect(await env.environment.queue.list(null)).toHaveLength(1);

    const destructive = (alert.mock.calls[0][2] ?? []).find((b) => b.text === 'Sil');
    await act(async () => destructive?.onPress?.());
    await waitFor(() => expect(screen.queryByText('Bir aktivite gönderilemedi.')).toBeNull());
    expect(await env.environment.queue.list(null)).toEqual([]);
  });

  it('başka hesabın bekleyen aktivitesi ve taslağı gösterilmez, silinir', async () => {
    const env = createTestEnvironment();
    await env.environment.queue.enqueue('local-1', input, 'eski-hesap');
    await env.environment.drafts.save(
      { v: 1, startedAt: 1, activeMs: 1000, distanceM: 100, segment: 0, points: [], savedAt: 2 },
      'eski-hesap',
    );
    const { services } = offlineServices({ value: true });
    await renderRun('default', { env, services: createMockServices({ signedIn: true }) });
    await screen.findByText('Son aktiviten');

    expect(screen.queryByText(/bağlantı gelince gönderilecek/)).toBeNull();
    expect(screen.queryByText('Yarım kalan aktivite var')).toBeNull();
    expect(await env.storage.getItem('@4tree/activity-queue/v1')).toBeNull();
    expect(await env.storage.getItem('@4tree/activity-draft/v1')).toBeNull();
    void services;
  });

  it('kuyruk boşsa gösterge yoktur', async () => {
    await renderRun();
    await screen.findByText('Son aktiviten');
    expect(screen.queryByText(/bağlantı gelince gönderilecek/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Şimdi gönder' })).toBeNull();
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

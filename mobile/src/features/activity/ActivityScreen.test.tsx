import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { StrictMode } from 'react';
import { Alert, Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { setReducedMotion } from '@/components/illustration/reanimatedTestMock';
import { createMockServices, ServicesProvider, type Services } from '@/services';

import { ActivityScreen, type ActivityMode } from './ActivityScreen';
import { ServiceError } from '@/services';
import { createTestEnvironment, sampleAt, T0, TestEnvironment } from './testing';
import { initialTrackerState, toSnapshot, trackerReducer } from './trackerReducer';

jest.mock('react-native-reanimated', () =>
  jest.requireActual('../../components/illustration/reanimatedTestMock').createReanimatedMock(),
);
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));
const mockDismissTo = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ dismissTo: mockDismissTo, replace: jest.fn(), push: jest.fn() }),
}));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

type Setup = ReturnType<typeof createTestEnvironment>;

async function renderActivity(
  mode: ActivityMode = 'new',
  options: { env?: Setup; services?: Services; strict?: boolean } = {},
) {
  const env = options.env ?? createTestEnvironment();
  const services = options.services ?? createMockServices();
  const tree = (
    <SafeAreaProvider initialMetrics={METRICS}>
      <ServicesProvider services={services}>
        <TestEnvironment environment={env.environment}>
          <ActivityScreen mode={mode} />
        </TestEnvironment>
      </ServicesProvider>
    </SafeAreaProvider>
  );
  await render(options.strict ? <StrictMode>{tree}</StrictMode> : tree);
  return { ...env, services };
}

/** Saniyede bir ölçüm: `speedMs` ile doğuya `seconds` saniye ilerler. */
async function drive(env: Setup, seconds: number, speedMs: number, fromSec = 0, fromMeters = 0) {
  for (let i = 1; i <= seconds; i++) {
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    await act(async () => env.locationSource.emit(sampleAt(fromSec + i, fromMeters + i * speedMs)));
  }
}

const button = (name: string) => screen.getByRole('button', { name });

async function longPressFinish() {
  await fireEvent(button('Bitir'), 'longPress');
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ now: T0 });
  setReducedMotion(false);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('ActivityScreen: izin', () => {
  it('izin yoksa anlaşılır durum ve "Ayarları aç" gösterir', async () => {
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    await renderActivity('new', { env: createTestEnvironment({ permission: 'denied' }) });

    expect(await screen.findByText('Konum izni kapalı')).toBeTruthy();
    await fireEvent.press(button('Ayarları aç'));
    expect(openSettings).toHaveBeenCalledTimes(1);

    await fireEvent.press(button('Geri dön'));
    expect(mockDismissTo).toHaveBeenCalledWith('/');
  });
});

describe('ActivityScreen: aktif aktivite', () => {
  it('başlar, ekranı açık tutar, "Konum aranıyor…" ve sayaç gösterir', async () => {
    const env = await renderActivity();

    expect(await screen.findByText('Konum aranıyor…')).toBeTruthy();
    expect(useKeepAwake).toHaveBeenCalled();
    expect(env.locationSource.startCalls).toBe(1);
    expect(screen.getByLabelText('Süre 00:00')).toBeTruthy();
    expect(screen.getByLabelText('Mesafe 0,00 kilometre')).toBeTruthy();
    expect(screen.getByLabelText('Anlık tempo henüz yok')).toBeTruthy();
    expect(screen.getByLabelText('Ortalama tempo henüz yok')).toBeTruthy();
    expect(button('Duraklat')).toBeTruthy();
    expect(button('Bitir')).toBeTruthy();
  });

  it('süre akar; mesafe (km, virgül) ve tempo ("5:33") canlı güncellenir', async () => {
    const env = await renderActivity();
    await screen.findByText('Konum aranıyor…');
    await drive(env, 30, 3);

    expect(screen.queryByText('Konum aranıyor…')).toBeNull();
    expect(screen.getByLabelText('Süre 00:30')).toBeTruthy();
    expect(screen.getByLabelText(/^Mesafe 0,0[89] kilometre$/)).toBeTruthy();
    expect(screen.getByLabelText(/^Anlık tempo 5:3[345] dakika kilometre$/)).toBeTruthy();
    expect(screen.getByLabelText(/^Ortalama tempo \d:\d\d dakika kilometre$/)).toBeTruthy();
    // Rota çizimi (harita karosu yok, çizgi var); jest'te yerleşim olayı elle verilir.
    await fireEvent(screen.getByTestId('live-route'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 220 } },
    });
    expect(screen.getByRole('image', { name: 'Rotan' })).toBeTruthy();
  });

  it('ağaç ilerlemesini gösterir: toplam 147,6 km + bu aktivite', async () => {
    const env = await renderActivity();
    expect(await screen.findByText('Ağacına 12,4 km kaldı.')).toBeTruthy();
    await drive(env, 40, 3);
    expect(screen.getByText('Ağacına 12,3 km kaldı.')).toBeTruthy();
  });

  it('profil alınamazsa ağaç satırı gizlenir ama aktivite sürer', async () => {
    const base = createMockServices();
    const services: Services = { ...base, profile: { ...base.profile, getProfile: () => Promise.reject(new Error('x')) } };
    await renderActivity('new', { services });
    await screen.findByText('Konum aranıyor…');
    expect(screen.queryByText(/Ağacına/)).toBeNull();
  });

  it('Duraklat: Light haptic, süre durur, "Devam et" görünür; Devam et süreci sürdürür', async () => {
    const env = await renderActivity();
    await screen.findByText('Konum aranıyor…');
    await drive(env, 10, 3);
    expect(screen.getByLabelText('Süre 00:10')).toBeTruthy();

    await fireEvent.press(button('Duraklat'));
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
    expect(screen.getByText('Duraklatıldı.')).toBeTruthy();
    expect(button('Devam et')).toBeTruthy();
    expect(env.locationSource.isRunning()).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(screen.getByLabelText('Süre 00:10')).toBeTruthy();

    await fireEvent.press(button('Devam et'));
    expect(screen.queryByText('Duraklatıldı.')).toBeNull();
    expect(button('Duraklat')).toBeTruthy();
    expect(env.locationSource.startCalls).toBe(2);
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByLabelText('Süre 00:15')).toBeTruthy();
  });

  it('Bitir: dokunmak bitirmez, ipucunu gösterir; basılı tutmak bitirir (Success haptic)', async () => {
    const env = await renderActivity();
    await screen.findByText('Konum aranıyor…');
    await drive(env, 30, 3);

    await fireEvent.press(button('Bitir'));
    expect(screen.getByText('Bitirmek için basılı tut')).toBeTruthy();
    expect(screen.queryByText('Aktivite tamamlandı')).toBeNull();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();

    await longPressFinish();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    expect(await screen.findByText('Aktivite tamamlandı')).toBeTruthy();
    expect(env.locationSource.isRunning()).toBe(false);
  });

  it('Reduce Motion açıkken de aynı ekranı gösterir', async () => {
    setReducedMotion(true);
    await renderActivity();
    expect(await screen.findByText('Konum aranıyor…')).toBeTruthy();
    expect(button('Duraklat')).toBeTruthy();
  });

  it('koşarken hedefler büyük: kontroller >= 64 dp yüksekliğinde', async () => {
    await renderActivity();
    await screen.findByText('Konum aranıyor…');
    const style = button('Duraklat').props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style.flat(Infinity).filter(Boolean)) : style;
    expect(flat.height).toBeGreaterThanOrEqual(64);
  });

  it('kaynak hata verirse konum alınamıyor mesajı gösterir', async () => {
    const env = await renderActivity();
    await screen.findByText('Konum aranıyor…');
    await act(async () => env.locationSource.fail('kapalı'));
    expect(
      screen.getByText('Konum alınamıyor. Konum servislerinin açık olduğundan emin ol.'),
    ).toBeTruthy();
  });

  it('çalışırken taslağı diske yazar (uygulama kapanırsa kurtarılabilsin)', async () => {
    const env = await renderActivity();
    await screen.findByText('Konum aranıyor…');
    await drive(env, 12, 3);
    const raw = await env.storage.getItem('@4tree/activity-draft/v1');
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw as string);
    expect(stored.userId).toBeNull();
    expect(stored.snapshot.distanceM).toBeGreaterThan(10);
  });
});

describe('ActivityScreen: bitiş özeti', () => {
  async function finishRun(env: Setup, kmh: number, seconds: number) {
    await drive(env, seconds, kmh / 3.6);
    await longPressFinish();
    await screen.findByText('Aktivite tamamlandı');
  }

  it('hızlı hareketi "Koşu" önerir; mesafe, süre, tempo ve kazanılan ağaç satırı görünür', async () => {
    const env = await renderActivity();
    await screen.findByText('Konum aranıyor…');
    await finishRun(env, 10, 120);

    expect(screen.getByRole('radio', { name: 'Koşu', selected: true })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Yürüyüş', selected: false })).toBeTruthy();
    expect(screen.getByText('Hızına göre koşu olarak önerildi. Yanlışsa dokunup değiştir.')).toBeTruthy();
    expect(screen.getByLabelText('Mesafe 0,33 km')).toBeTruthy();
    expect(screen.getByLabelText('Süre 02:00')).toBeTruthy();
    expect(screen.getByLabelText(/^Ortalama tempo \d:\d\d dk\/km$/)).toBeTruthy();
    expect(screen.getByRole('image', { name: 'Rota çizimi' })).toBeTruthy();
    expect(screen.getByText('Ağacına 12,1 km kaldı.')).toBeTruthy();
    expect(button('Kaydet')).toBeTruthy();
    expect(button('Vazgeç (sil)')).toBeTruthy();
  });

  it('yavaş hareketi "Yürüyüş" önerir', async () => {
    const env = await renderActivity();
    await screen.findByText('Konum aranıyor…');
    await finishRun(env, 5, 120);
    expect(screen.getByRole('radio', { name: 'Yürüyüş', selected: true })).toBeTruthy();
    expect(screen.getByText('Hızına göre yürüyüş olarak önerildi. Yanlışsa dokunup değiştir.')).toBeTruthy();
  });

  it('tek dokunuşla tür düzeltilir ve Kaydet düzeltilen türle saveActivity çağırır', async () => {
    const env = await renderActivity();
    await screen.findByText('Konum aranıyor…');
    await finishRun(env, 10, 120);
    const saveActivity = jest.spyOn(env.services.activity, 'saveActivity');

    await fireEvent.press(screen.getByRole('radio', { name: 'Yürüyüş' }));
    expect(screen.getByRole('radio', { name: 'Yürüyüş', selected: true })).toBeTruthy();

    await fireEvent.press(button('Kaydet'));
    expect(saveActivity).toHaveBeenCalledTimes(1);
    const arg = saveActivity.mock.calls[0][0];
    expect(arg.type).toBe('walk');
    expect(arg.durationSec).toBe(120);
    expect(arg.distanceKm).toBeCloseTo(0.33, 2);
    expect(arg.route.length).toBeGreaterThan(20);
    expect(arg.startedAt).toBe(new Date(T0).toISOString());

    expect(mockDismissTo).toHaveBeenCalledWith('/');
    // Başarılı kayıttan sonra taslak ve kuyruk boş.
    expect(await env.storage.getItem('@4tree/activity-draft/v1')).toBeNull();
    expect(await env.environment.queue.list(null)).toEqual([]);
  });

  it('kayıt başarısız olursa aktivite yerel kuyruğa alınır ve "bağlantı gelince" bilgisi çıkar', async () => {
    const base = createMockServices();
    const services: Services = {
      ...base,
      activity: { ...base.activity, saveActivity: jest.fn(() => Promise.reject(new Error('ağ yok'))) },
    };
    const env = await renderActivity('new', { services });
    await screen.findByText('Konum aranıyor…');
    await finishRun(env, 10, 120);

    await fireEvent.press(button('Kaydet'));
    expect(await screen.findByText('Aktiviten telefonda saklandı')).toBeTruthy();
    expect(screen.getByText('Bağlantı gelince gönderilecek.')).toBeTruthy();

    const queued = await env.environment.queue.list(null);
    expect(queued).toHaveLength(1);
    expect(queued[0].input.type).toBe('run');
    expect(queued[0].localId).toBe(`local-${new Date(T0).toISOString()}`);
    // Taslak kuyruğa alınınca silinir (iki yerde tutulmaz).
    expect(await env.storage.getItem('@4tree/activity-draft/v1')).toBeNull();

    await fireEvent.press(button('Tamam'));
    expect(mockDismissTo).toHaveBeenCalledWith('/');
  });

  it('sunucu aktiviteyi geçersiz sayarsa (invalid) kuyruğa ALINMAZ; hata gösterilir, silinebilir', async () => {
    const base = createMockServices();
    const services: Services = {
      ...base,
      activity: {
        ...base.activity,
        saveActivity: jest.fn(() => Promise.reject(new ServiceError('invalid', 'geçersiz'))),
      },
    };
    const env = await renderActivity('new', { services });
    await screen.findByText('Konum aranıyor…');
    await finishRun(env, 10, 120);

    await fireEvent.press(button('Kaydet'));
    expect(
      await screen.findByText('Aktivite kabul edilmedi, bilgilerinde bir sorun var. "Vazgeç (sil)" ile silebilirsin.'),
    ).toBeTruthy();
    expect(await env.environment.queue.list(null)).toEqual([]);
    expect(screen.queryByText('Aktiviten telefonda saklandı')).toBeNull();
    // Taslak silinmedi, kullanıcı hâlâ kaydedebilir ya da silebilir.
    expect(await env.storage.getItem('@4tree/activity-draft/v1')).not.toBeNull();
    expect(button('Kaydet')).toBeTruthy();
    expect(button('Vazgeç (sil)')).toBeTruthy();
    expect(mockDismissTo).not.toHaveBeenCalled();
  });

  it('kuyruğa alınan kayıt oturumdaki kullanıcıya damgalanır', async () => {
    const base = createMockServices({ signedIn: true });
    const services: Services = {
      ...base,
      activity: { ...base.activity, saveActivity: jest.fn(() => Promise.reject(new Error('ağ yok'))) },
    };
    const env = await renderActivity('new', { services });
    await screen.findByText('Konum aranıyor…');
    await finishRun(env, 10, 120);
    await fireEvent.press(button('Kaydet'));
    await screen.findByText('Aktiviten telefonda saklandı');

    const queued = await env.environment.queue.list();
    expect(queued).toHaveLength(1);
    expect(queued[0].userId).toBe('mock-user-elif');
  });

  it('Kaydet iki kez basılsa da tek kayıt gider', async () => {
    const env = await renderActivity();
    await screen.findByText('Konum aranıyor…');
    await finishRun(env, 10, 120);
    const saveActivity = jest.spyOn(env.services.activity, 'saveActivity');
    const save = button('Kaydet');
    await fireEvent.press(save);
    await fireEvent.press(save);
    expect(saveActivity).toHaveBeenCalledTimes(1);
  });

  it('Vazgeç (sil): onay ister; onaylanınca kaydetmeden çıkar ve taslağı siler', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const env = await renderActivity();
    await screen.findByText('Konum aranıyor…');
    await finishRun(env, 10, 120);
    const saveActivity = jest.spyOn(env.services.activity, 'saveActivity');

    await fireEvent.press(button('Vazgeç (sil)'));
    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert.mock.calls[0][0]).toBe('Aktivite silinsin mi?');
    // Onaylanmadan hiçbir şey olmaz.
    expect(mockDismissTo).not.toHaveBeenCalled();

    const buttons = alert.mock.calls[0][2] ?? [];
    const destructive = buttons.find((b) => b.text === 'Sil');
    await act(async () => destructive?.onPress?.());
    expect(mockDismissTo).toHaveBeenCalledWith('/');
    expect(saveActivity).not.toHaveBeenCalled();
    expect(await env.storage.getItem('@4tree/activity-draft/v1')).toBeNull();
    expect(await env.environment.queue.list(null)).toEqual([]);
  });

  it('hiç mesafe yoksa boş durum gösterir, kaydetmeye izin vermez', async () => {
    const env = await renderActivity();
    await screen.findByText('Konum aranıyor…');
    await act(async () => {
      jest.advanceTimersByTime(20_000);
    });
    await longPressFinish();

    expect(await screen.findByText('Kaydedilecek mesafe yok')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Kaydet' })).toBeNull();
    await fireEvent.press(button('Tamam'));
    expect(mockDismissTo).toHaveBeenCalledWith('/');
    expect(env.locationSource.isRunning()).toBe(false);
  });
});

describe('ActivityScreen: izin kaybı ve Strict Mode', () => {
  it('Devam et sırasında izin geri alınmışsa duraklatılmış kalır, metin ve "Ayarları aç" gösterir', async () => {
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    const env = await renderActivity();
    await screen.findByText('Konum aranıyor…');
    await drive(env, 10, 3);
    await fireEvent.press(button('Duraklat'));
    env.locationSource.permission = 'blocked';

    await fireEvent.press(button('Devam et'));

    expect(await screen.findByText('Konum izni kapalı, kayıt duraklatıldı. Ayarlardan açıp devam et.')).toBeTruthy();
    expect(button('Devam et')).toBeTruthy();
    expect(screen.getByLabelText('Süre 00:10')).toBeTruthy();
    await fireEvent.press(button('Ayarları aç'));
    expect(openSettings).toHaveBeenCalledTimes(1);

    // İzin açılınca devam eder ve uyarı kalkar.
    env.locationSource.permission = 'granted';
    await fireEvent.press(button('Devam et'));
    expect(screen.queryByText(/Konum izni kapalı, kayıt duraklatıldı/)).toBeNull();
    expect(button('Duraklat')).toBeTruthy();
  });

  it('Strict Mode: yeni aktivite bir kez başlar ve takip açık kalır', async () => {
    const env = await renderActivity('new', { strict: true });
    expect(await screen.findByText('Konum aranıyor…')).toBeTruthy();
    expect(env.locationSource.activeCount()).toBe(1);
  });
});

describe('ActivityScreen: yarım kalan aktivite', () => {
  async function envWithDraft() {
    const env = createTestEnvironment();
    let state = trackerReducer(initialTrackerState, { type: 'start', now: T0 });
    for (let i = 1; i <= 120; i++) {
      state = trackerReducer(state, { type: 'sample', sample: sampleAt(i, i * 3) });
    }
    state = trackerReducer(state, { type: 'pause', now: T0 + 120_000 });
    const snapshot = toSnapshot(state, T0 + 120_000)!;
    await env.environment.drafts.save(snapshot, null);
    return { env, snapshot };
  }

  it('resume: taslağı duraklatılmış açar, kaldığı süre ve mesafeyle devam eder', async () => {
    const { env } = await envWithDraft();
    await renderActivity('resume', { env });

    expect(await screen.findByText('Duraklatıldı.')).toBeTruthy();
    expect(screen.getByLabelText('Süre 02:00')).toBeTruthy();
    expect(screen.getByLabelText(/^Mesafe 0,3[56] kilometre$/)).toBeTruthy();

    await fireEvent.press(button('Devam et'));
    expect(env.locationSource.startCalls).toBe(1);
    expect(button('Duraklat')).toBeTruthy();
  });

  it('finish: taslağı doğrudan bitiş özetine açar; Kaydet ile kaydedilir', async () => {
    const { env } = await envWithDraft();
    const { services } = await renderActivity('finish', { env });
    const saveActivity = jest.spyOn(services.activity, 'saveActivity');

    expect(await screen.findByText('Aktivite tamamlandı')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Koşu', selected: true })).toBeTruthy();
    expect(env.locationSource.startCalls).toBe(0);

    await fireEvent.press(button('Kaydet'));
    expect(saveActivity).toHaveBeenCalledTimes(1);
    expect(saveActivity.mock.calls[0][0].durationSec).toBe(120);
    expect(mockDismissTo).toHaveBeenCalledWith('/');
    expect(await env.storage.getItem('@4tree/activity-draft/v1')).toBeNull();
  });

  it('Strict Mode çift effect: taslak yine de yüklenir (ilk yükleme iptal olsa da ikincisi uygulanır)', async () => {
    const { env } = await envWithDraft();
    await renderActivity('resume', { env, strict: true });
    expect(await screen.findByText('Duraklatıldı.')).toBeTruthy();
    expect(screen.getByLabelText('Süre 02:00')).toBeTruthy();
  });

  it('başka kullanıcının taslağı gösterilmez ve silinir', async () => {
    const env = createTestEnvironment();
    let state = trackerReducer(initialTrackerState, { type: 'start', now: T0 });
    state = trackerReducer(state, { type: 'sample', sample: sampleAt(1, 0) });
    state = trackerReducer(state, { type: 'sample', sample: sampleAt(5, 30) });
    state = trackerReducer(state, { type: 'pause', now: T0 + 6000 });
    await env.environment.drafts.save(toSnapshot(state, T0 + 6000)!, 'baska-kullanici');

    await renderActivity('resume', { env, services: createMockServices({ signedIn: true }) });

    expect(await screen.findByText('Yarım kalan aktivite bulunamadı.')).toBeTruthy();
    expect(await env.storage.getItem('@4tree/activity-draft/v1')).toBeNull();
  });

  it('taslak yoksa anlaşılır mesaj ve geri dönüş sunar', async () => {
    await renderActivity('resume');
    expect(await screen.findByText('Yarım kalan aktivite bulunamadı.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Geri dön' }));
    expect(mockDismissTo).toHaveBeenCalledWith('/');
  });
});

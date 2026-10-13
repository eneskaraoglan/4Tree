import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { StyleSheet } from 'react-native';

import { getMotionCalls, resetMotionCalls, setReducedMotion } from '@/components/illustration/reanimatedTestMock';
import {
  createMockServices,
  ServiceError,
  ServicesProvider,
  type FeedScope,
  type FeedService,
  type MockScenario,
  type Services,
} from '@/services';
import type { FeedPost, ReactionType } from '@/types';

import { FeedScreen } from './FeedScreen';

jest.mock('react-native-reanimated', () => {
  const mock = jest.requireActual('../../components/illustration/reanimatedTestMock').createReanimatedMock();
  // Ortak sahtede cancelAnimation yok; ReactionBar çıkışta çağırır.
  const cancelAnimation = jest.fn();
  return { ...mock, cancelAnimation, default: { ...mock.default, cancelAnimation } };
});
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

/** Mock gönderi 001 08:05 (+03:00); "şimdi" ondan 2 saat sonrası. */
const NOW = new Date(new Date('2026-10-10T08:05:00+03:00').getTime() + 2 * 3600 * 1000);

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void };
function defer<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function withFeed(overrides: Partial<FeedService>, base: Services = createMockServices()): Services {
  return { ...base, feed: { ...base.feed, ...overrides } };
}

async function renderFeed(services: Services = createMockServices()) {
  await render(
    <ServicesProvider services={services}>
      <FeedScreen now={NOW} />
    </ServicesProvider>,
  );
}

async function renderScenario(scenario: MockScenario, latencyMs = 0) {
  await renderFeed(createMockServices({ scenario, latencyMs }));
}

/** Zeynep'in gönderisi: 24 alkış, 9 su, 3 yaprak, 2 kalp; henüz tepkim yok. */
const zeynep = () => within(screen.getByTestId('post-post-002'));
const zeynepButton = () => zeynep().getByTestId('reactions-post-002-button');
const GIVE = 'Tepki ver';
const WATER_ON = 'Tepkin: Su ver, geri almak için dokun';
const CLAP_ON = 'Tepkin: Alkışla, geri almak için dokun';
/** Zeynep'in özeti: 38 tepki. Su vermek 39 yapar. */
const SUMMARY_38 = '38 tepki: Su ver 9, Alkışla 24, Yaprak 3, Kalp 2';
const SUMMARY_WATER_39 = '39 tepki: Su ver 10, Alkışla 24, Yaprak 3, Kalp 2';

const setReactionMock = (base: Services, pending?: Promise<void>) =>
  jest.fn(async (id: string, reaction: ReactionType | null) => {
    if (pending) await pending;
    return base.feed.setReaction(id, reaction);
  });

describe('FeedScreen', () => {
  // FlatList toplu çizim zamanlayıcısı (50 ms) test bitince act dışında tetiklenip uyarı vermesin.
  afterEach(async () => {
    await act(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 60));
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    setReducedMotion(false);
    resetMotionCalls();
  });

  it('varsayılan senaryoda gönderi içeriğini kartsız akış olarak gösterir', async () => {
    await renderFeed();

    const mert = within(await screen.findByTestId('post-post-001'));
    expect(mert.getByText('Mert')).toBeTruthy();
    expect(mert.getByText('2 saat önce')).toBeTruthy();
    expect(mert.getByText("Sisli bir sabahtı, Belgrad'da ilk kez 10'u gördüm.")).toBeTruthy();
    expect(mert.getByText('10,2 km')).toBeTruthy();
    expect(mert.getByText('Koşu · 56 dk · Belgrad Ormanı')).toBeTruthy();
    expect(mert.getByLabelText('10,2 km rota çizimi')).toBeTruthy();
    expect(mert.getByText('3 yorum')).toBeTruthy();
    // Tek konum: tek tepki düğmesi (kendi tepkim) ve tek özet; eski iki düğme yok.
    expect(mert.getByRole('button', { name: CLAP_ON, selected: true })).toBeTruthy();
    expect(mert.getAllByRole('button')).toHaveLength(1);
    expect(mert.getByLabelText('23 tepki: Su ver 4, Alkışla 18, Güç 1')).toBeTruthy();
    expect(zeynep().getByRole('button', { name: GIVE, selected: false })).toBeTruthy();
    expect(mert.queryByTestId('tree-glyphs')).toBeNull();

    expect(zeynep().getByText('Yürüyüş · 1 sa 41 dk · Kaz Dağları')).toBeTruthy();
    expect(zeynep().getByLabelText('1 ağaç kazandı')).toBeTruthy();
    expect(zeynep().getAllByTestId('tree-glyph')).toHaveLength(1);
  });

  it('en çok 5 ağaç glifi çizer, fazlasını "+N" yazar', async () => {
    const post: FeedPost = {
      id: 'post-big',
      isFriend: true,
      author: { id: 'u', name: 'Defne', avatarInitial: 'D' },
      activity: { type: 'run', distanceKm: 42.2, durationSec: 14000, paceSecPerKm: 330, place: 'Bolu' },
      treesEarned: 7,
      reactionCounts: {},
      myReaction: null,
      commentCount: 0,
      createdAt: '2026-10-10T08:00:00+03:00',
    };
    await renderFeed(withFeed({ getPosts: async () => [post] }));

    const item = within(await screen.findByTestId('post-post-big'));
    expect(item.getAllByTestId('tree-glyph')).toHaveLength(5);
    expect(item.getByText('+2')).toBeTruthy();
    expect(item.getByLabelText('7 ağaç kazandı')).toBeTruthy();
    expect(item.queryByText('yorum', { exact: false })).toBeNull();
    // Rotası olmayan gönderide rota alanı hiç gösterilmez (sahte rota uydurulmaz).
    expect(item.queryByLabelText('rota çizimi', { exact: false })).toBeNull();
    expect(item.queryByTestId('route-contours', { includeHiddenElements: true })).toBeNull();
  });

  it('rotası olan gönderide rota çizimini ve arkasında kontur çizgilerini gösterir', async () => {
    await renderFeed();
    const mert = within(await screen.findByTestId('post-post-001'));
    expect(mert.getByLabelText('10,2 km rota çizimi')).toBeTruthy();
    const contours = mert.getAllByTestId('route-contour', { includeHiddenElements: true });
    expect(contours.length).toBeGreaterThanOrEqual(3);
    expect(contours.length).toBeLessThanOrEqual(4);
  });

  it('dokununca Su ver: iyimser günceller, haptic verir ve onaylanınca korur', async () => {
    const pending = defer<void>();
    const base = createMockServices();
    const setReaction = setReactionMock(base, pending.promise);
    await renderFeed(withFeed({ setReaction }, base));
    await screen.findByTestId('post-post-002');
    expect(zeynep().getByLabelText(SUMMARY_38)).toBeTruthy();

    await fireEvent.press(zeynepButton());
    // Sunucu yanıtı gelmeden ekran güncellenir.
    expect(zeynep().getByRole('button', { name: WATER_ON, selected: true })).toBeTruthy();
    expect(zeynep().getByLabelText(SUMMARY_WATER_39)).toBeTruthy();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
    expect(setReaction).toHaveBeenCalledWith('post-002', 'water');

    await act(async () => pending.resolve());
    expect(zeynep().getByLabelText(WATER_ON)).toBeTruthy();
    expect(zeynep().getByLabelText(SUMMARY_WATER_39)).toBeTruthy();
  });

  it('aynı düğmeye tekrar dokunmak tepkiyi geri alır ve sayıyı düşürür', async () => {
    const base = createMockServices();
    const setReaction = setReactionMock(base);
    await renderFeed(withFeed({ setReaction }, base));
    await screen.findByTestId('post-post-002');

    await fireEvent.press(zeynepButton());
    expect(await zeynep().findByLabelText(WATER_ON)).toBeTruthy();
    await fireEvent.press(zeynepButton());
    expect(await zeynep().findByLabelText(GIVE)).toBeTruthy();
    expect(zeynep().getByLabelText(SUMMARY_38)).toBeTruthy();
    expect(setReaction.mock.calls.map((c) => c[1])).toEqual(['water', null]);
  });

  it('basılı tutunca seçici açılır; seçilen tepki düğmeyi ve özeti günceller, seçici kapanır', async () => {
    const base = createMockServices();
    const setReaction = setReactionMock(base);
    await renderFeed(withFeed({ setReaction }, base));
    await screen.findByTestId('post-post-002');
    expect(screen.queryByTestId('reaction-picker')).toBeNull();

    await fireEvent(zeynepButton(), 'longPress');
    expect(await screen.findByTestId('reaction-picker')).toBeTruthy();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('medium');
    for (const label of ['Su ver', 'Alkışla', 'Yaprak', 'Kalp', 'Güç']) {
      expect(screen.getByRole('menuitem', { name: label })).toBeTruthy();
    }

    await fireEvent.press(screen.getByRole('menuitem', { name: 'Kalp' }));
    expect(screen.queryByTestId('reaction-picker')).toBeNull();
    expect(setReaction).toHaveBeenCalledWith('post-002', 'heart');
    expect(await zeynep().findByLabelText('Tepkin: Kalp, geri almak için dokun')).toBeTruthy();
    expect(zeynep().getByLabelText('39 tepki: Su ver 9, Alkışla 24, Yaprak 3, Kalp 3')).toBeTruthy();
  });

  it('servis yalnız su ve alkışı destekliyorsa seçicide başka tür çıkmaz', async () => {
    const base = createMockServices();
    await renderFeed(withFeed({ supportedReactions: ['water', 'clap'] }, base));
    await screen.findByTestId('post-post-002');
    await fireEvent(zeynepButton(), 'longPress');
    expect(screen.getAllByRole('menuitem').map((el) => el.props.accessibilityLabel)).toEqual(['Su ver', 'Alkışla']);
    expect(screen.queryByRole('menuitem', { name: 'Kalp' })).toBeNull();
  });

  it('hata olursa tepkiyi geri alır ve kısa Türkçe mesaj gösterir', async () => {
    const setReaction = jest.fn().mockRejectedValue(new ServiceError('network', 'Sunucuya ulaşılamadı.'));
    await renderFeed(withFeed({ setReaction }));
    await screen.findByTestId('post-post-002');

    await fireEvent.press(zeynepButton());
    expect(await screen.findByText('Tepki gönderilemedi. Tekrar dene.')).toBeTruthy();
    expect(zeynep().getByRole('button', { name: GIVE, selected: false })).toBeTruthy();
    expect(zeynep().getByLabelText(SUMMARY_38)).toBeTruthy();
  });

  it('çift dokunuşta istekleri sıraya dizer ve son istenen değerde kalır', async () => {
    const base = createMockServices();
    const first = defer<void>();
    const calls: (ReactionType | null)[] = [];
    const setReaction = jest.fn(async (id: string, reaction: ReactionType | null) => {
      calls.push(reaction);
      if (calls.length === 1) await first.promise;
      return base.feed.setReaction(id, reaction);
    });
    await renderFeed(withFeed({ setReaction }, base));
    await screen.findByTestId('post-post-002');

    await fireEvent.press(zeynepButton());
    await fireEvent.press(zeynepButton());
    // İlk istek bitmeden ikinci gönderilmez; ekran zaten son değeri gösterir.
    expect(calls).toEqual(['water']);
    expect(zeynep().getByLabelText(GIVE)).toBeTruthy();

    await act(async () => first.resolve());
    expect(calls).toEqual(['water', null]);
    expect(await zeynep().findByLabelText(GIVE)).toBeTruthy();
    expect(zeynep().getByLabelText(SUMMARY_38)).toBeTruthy();
  });

  it('çift dokunuşun ikinci isteği düşerse son onaylı değere döner', async () => {
    const base = createMockServices();
    const first = defer<void>();
    let n = 0;
    const setReaction = jest.fn(async (id: string, reaction: ReactionType | null) => {
      n += 1;
      if (n === 1) {
        await first.promise;
        return base.feed.setReaction(id, reaction);
      }
      throw new ServiceError('network', 'x');
    });
    await renderFeed(withFeed({ setReaction }, base));
    await screen.findByTestId('post-post-002');

    await fireEvent.press(zeynepButton());
    await fireEvent.press(zeynepButton());
    await act(async () => first.resolve());

    // İlk istek onaylandı (Su ver, 39); ikincisi düştü, sunucudaki değere dönülür.
    expect(await zeynep().findByLabelText(WATER_ON)).toBeTruthy();
    expect(zeynep().getByLabelText(SUMMARY_WATER_39)).toBeTruthy();
    expect(await screen.findByText('Tepki gönderilemedi. Tekrar dene.')).toBeTruthy();
  });

  it('Reduce Motion kapalıyken tepki verilince ikon sıçrar', async () => {
    await renderFeed();
    await screen.findByTestId('post-post-002');
    await fireEvent.press(zeynepButton());
    expect(await zeynep().findByLabelText(WATER_ON)).toBeTruthy();
    expect(getMotionCalls().sequence).toBeGreaterThan(0);
  });

  it('Reduce Motion açıkken sıçrama animasyonu çalışmaz', async () => {
    setReducedMotion(true);
    await renderFeed();
    await screen.findByTestId('post-post-002');
    await fireEvent.press(zeynepButton());
    expect(await zeynep().findByLabelText(WATER_ON)).toBeTruthy();
    expect(getMotionCalls().sequence).toBe(0);
  });

  it('tepki düğmesi ve sekmeler en az 44 dp dokunma alanı verir', async () => {
    await renderFeed();
    await screen.findByTestId('post-post-002');
    const style = StyleSheet.flatten(zeynepButton().props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
    const tab = StyleSheet.flatten(screen.getByRole('tab', { name: 'Herkes' }).props.style);
    expect(tab.minHeight).toBeGreaterThanOrEqual(44);
  });

  it('sekmeler arasında geçiş yapar; Arkadaşlar yalnız arkadaşları, Herkes hepsini gösterir', async () => {
    const base = createMockServices();
    const getPosts = jest.fn((scope?: FeedScope) => base.feed.getPosts(scope));
    await renderFeed(withFeed({ getPosts }, base));
    await screen.findByTestId('post-post-001');
    expect(getPosts).toHaveBeenLastCalledWith('friends', expect.anything());
    expect(screen.getByRole('tab', { name: 'Arkadaşlar', selected: true })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Herkes', selected: false })).toBeTruthy();
    expect(screen.queryByText('Selin')).toBeNull();

    await fireEvent.press(screen.getByRole('tab', { name: 'Herkes' }));
    expect(screen.getByRole('tab', { name: 'Herkes', selected: true })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Arkadaşlar', selected: false })).toBeTruthy();
    expect(await screen.findByText('Selin')).toBeTruthy();
    expect(getPosts).toHaveBeenLastCalledWith('everyone', expect.anything());

    // Arkadaşlara dönünce önbellek gösterilir, yeniden yüklenmez.
    await fireEvent.press(screen.getByRole('tab', { name: 'Arkadaşlar' }));
    expect(screen.queryByText('Selin')).toBeNull();
    expect(getPosts).toHaveBeenCalledTimes(2);
  });

  it('hızlı sekme değişiminde geç gelen yanıt öteki sekmeyi ezmez', async () => {
    const base = createMockServices();
    const everyone = defer<FeedPost[]>();
    const friends = defer<FeedPost[]>();
    const getPosts = jest.fn((scope?: FeedScope) => (scope === 'everyone' ? everyone.promise : friends.promise));
    await renderFeed(withFeed({ getPosts }, base));
    expect(screen.getByLabelText('Yükleniyor')).toBeTruthy();

    await fireEvent.press(screen.getByRole('tab', { name: 'Herkes' }));
    await fireEvent.press(screen.getByRole('tab', { name: 'Arkadaşlar' }));
    await fireEvent.press(screen.getByRole('tab', { name: 'Herkes' }));
    await fireEvent.press(screen.getByRole('tab', { name: 'Arkadaşlar' }));
    // Her sekme tek kez istenir.
    expect(getPosts).toHaveBeenCalledTimes(2);

    // Herkes yanıtı önce gelir; Arkadaşlar sekmesindeyiz, ekran hâlâ yükleniyor.
    await act(async () => everyone.resolve(await base.feed.getPosts('everyone')));
    expect(screen.queryByText('Selin')).toBeNull();
    expect(screen.getByLabelText('Yükleniyor')).toBeTruthy();

    await act(async () => friends.resolve(await base.feed.getPosts('friends')));
    expect(await screen.findByText('Mert')).toBeTruthy();
    expect(screen.queryByText('Selin')).toBeNull();

    await fireEvent.press(screen.getByRole('tab', { name: 'Herkes' }));
    expect(await screen.findByText('Selin')).toBeTruthy();
  });

  it('tepki uçuştayken çek-yenile iyimser durumu ezmez', async () => {
    const base = createMockServices();
    const pending = defer<void>();
    const setReaction = setReactionMock(base, pending.promise);
    await renderFeed(withFeed({ setReaction }, base));
    await screen.findByTestId('post-post-002');

    await fireEvent.press(zeynepButton());
    const refreshControl = screen.getByTestId('feed-list').props.refreshControl;
    await act(async () => {
      refreshControl.props.onRefresh();
    });
    // Yenileme sunucunun eski değerini getirdi ama kullanıcının tepkisi korunur.
    expect(zeynep().getByLabelText(WATER_ON)).toBeTruthy();
    expect(zeynep().getByLabelText(SUMMARY_WATER_39)).toBeTruthy();

    await act(async () => pending.resolve());
    expect(zeynep().getByLabelText(WATER_ON)).toBeTruthy();
    expect(setReaction).toHaveBeenCalledTimes(1);
  });

  it('hata geri alınırken ve geri alma dokunuşunda sıçrama olmaz; sadece vermede sıçrar', async () => {
    const setReaction = jest.fn().mockRejectedValue(new ServiceError('network', 'x'));
    await renderFeed(withFeed({ setReaction }));
    await screen.findByTestId('post-post-002');

    await fireEvent.press(zeynepButton());
    expect(await screen.findByText('Tepki gönderilemedi. Tekrar dene.')).toBeTruthy();
    // Tek sıçrama: kullanıcının dokunuşu. Geri alma (hata dönüşü) yeni sıçrama başlatmadı.
    expect(getMotionCalls().sequence).toBe(1);

    // Zaten aktif olan Mert'in alkışını geri almak sıçratmaz.
    resetMotionCalls();
    const mert = within(screen.getByTestId('post-post-001'));
    await fireEvent.press(mert.getByLabelText(CLAP_ON));
    expect(getMotionCalls().sequence).toBe(0);
  });

  it('yüklenirken sade iskelet gösterir', async () => {
    await renderScenario('default', 30);
    expect(screen.getByLabelText('Yükleniyor')).toBeTruthy();
    expect(await screen.findByTestId('post-post-001')).toBeTruthy();
    expect(screen.queryByLabelText('Yükleniyor')).toBeNull();
  });

  it("'empty' senaryosunda sıradaki adımı söyler; Herkes sekmesinde kendi cümlesi vardır", async () => {
    await renderScenario('empty');
    expect(await screen.findByText('Arkadaşların koşmaya başlayınca burada görünecek.')).toBeTruthy();
    expect(screen.queryByLabelText('Yükleniyor')).toBeNull();

    await fireEvent.press(screen.getByRole('tab', { name: 'Herkes' }));
    expect(await screen.findByText('Koşular paylaşıldıkça burada görünecek. İlk koşuyu sen yap.')).toBeTruthy();
  });

  it("'error' senaryosunda Türkçe mesaj ve Tekrar dene gösterir", async () => {
    await renderScenario('error');
    expect(await screen.findByText('Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tekrar dene' })).toBeTruthy();
  });

  it('Tekrar dene yeniden yükler ve akışı gösterir', async () => {
    const base = createMockServices();
    const getPosts = jest
      .fn<Promise<FeedPost[]>, [FeedScope?]>()
      .mockRejectedValueOnce(new ServiceError('network', 'x'))
      .mockImplementation((scope) => base.feed.getPosts(scope));
    await renderFeed(withFeed({ getPosts }, base));

    await fireEvent.press(await screen.findByRole('button', { name: 'Tekrar dene' }));
    expect(await screen.findByTestId('post-post-001')).toBeTruthy();
    expect(getPosts).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: 'Tekrar dene' })).toBeNull();
  });

  it('çek-yenile akışı yeniden yükler; yenileme hatasında eldeki akışı korur', async () => {
    const base = createMockServices();
    const getPosts = jest
      .fn<Promise<FeedPost[]>, [FeedScope?]>()
      .mockImplementationOnce((scope) => base.feed.getPosts(scope))
      .mockRejectedValueOnce(new ServiceError('network', 'x'))
      .mockImplementation((scope) => base.feed.getPosts(scope));
    await renderFeed(withFeed({ getPosts }, base));
    await screen.findByTestId('post-post-001');

    const pull = async () => {
      const refreshControl = screen.getByTestId('feed-list').props.refreshControl;
      await act(async () => {
        refreshControl.props.onRefresh();
      });
    };

    await pull();
    expect(getPosts).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('Akış yenilenemedi. Biraz sonra tekrar dene.')).toBeTruthy();
    expect(screen.getByTestId('post-post-001')).toBeTruthy();

    await pull();
    expect(getPosts).toHaveBeenCalledTimes(3);
  });

  it('odak false iken zaman tazelenmez, odağa dönünce tazelenir', async () => {
    jest.useFakeTimers({ now: NOW });
    try {
      const services = createMockServices();
      const view = (focused: boolean) => (
        <ServicesProvider services={services}>
          <FeedScreen focused={focused} />
        </ServicesProvider>
      );
      const { rerender } = await render(view(false));
      expect(await screen.findByText('2 saat önce')).toBeTruthy();

      // Odakta değilken saat geçer (dakikalık zamanlayıcı da çalışmaz).
      jest.setSystemTime(new Date(NOW.getTime() + 3600 * 1000));
      await act(async () => {
        jest.advanceTimersByTime(120_000);
      });
      expect(screen.getByText('2 saat önce')).toBeTruthy();

      await rerender(view(true));
      expect(screen.getByText('3 saat önce')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });
});

import * as Haptics from 'expo-haptics';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ServicesProvider, createMockServices, type Services } from '@/services';

import { AchievementsScreen } from './AchievementsScreen';
import { focusAccessibility } from './focusAccessibility';

jest.mock('react-native-reanimated', () => jest.requireActual('../../components/illustration/reanimatedTestMock').createReanimatedMock());
jest.mock('./formatBadgeDate', () => {
  // Cihaz saat diliminden bağımsız: tarihler Türkiye gününe göre gösterilir.
  const actual = jest.requireActual<typeof import('./formatBadgeDate')>('./formatBadgeDate');
  return {
    ...actual,
    formatStampDate: (iso?: string) => actual.formatStampDate(iso, 'Europe/Istanbul'),
    formatLongDate: (iso?: string) => actual.formatLongDate(iso, 'Europe/Istanbul'),
  };
});
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
jest.mock('./focusAccessibility', () => ({ focusAccessibility: jest.fn() }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

async function renderScreen(services: Services) {
  await render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 320, height: 568 }, insets: { top: 20, left: 0, right: 0, bottom: 34 } }}>
      <ServicesProvider services={services}>
        <AchievementsScreen />
      </ServicesProvider>
    </SafeAreaProvider>,
  );
}

describe('AchievementsScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('varsayılan: seviye adı, ilerleme cümlesi, pul özeti ve kazanılan/kilitli pullar', async () => {
    await renderScreen(createMockServices());

    expect(await screen.findByTestId('level-name')).toHaveTextContent('Fidan');
    expect(screen.getByTestId('level-sentence')).toHaveTextContent('Ağaç olmana 3 ağaç kaldı.');
    expect(screen.getByTestId('stamp-summary')).toHaveTextContent('5 / 9 pul topladın');
    expect(screen.getByRole('image', { name: /Şu an Fidan seviyesindesin/ })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /kazanıldı/ })).toHaveLength(5);
    expect(screen.getAllByRole('button', { name: /kilitli, nasıl kazanılır/ })).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'Erken kuş, kazanıldı, 9 Ekim 2026' })).toBeTruthy();
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(screen.queryByText('Yakında')).toBeNull();
  });

  it('yeni kullanıcı (empty): Tohum, tüm pullar kilitli ve cesaretlendiren tek cümle', async () => {
    await renderScreen(createMockServices({ scenario: 'empty' }));

    expect(await screen.findByTestId('level-name')).toHaveTextContent('Tohum');
    expect(screen.getByTestId('level-sentence')).toHaveTextContent('Fidan olmana 3 ağaç kaldı.');
    expect(screen.getByTestId('empty-hint')).toHaveTextContent(
      'Pasaportun henüz boş, ilk koşunla ilk pulunu kazanırsın.',
    );
    expect(screen.queryByTestId('stamp-summary')).toBeNull();
    expect(screen.queryAllByRole('button', { name: /kazanıldı/ })).toHaveLength(0);
    expect(screen.getAllByRole('button', { name: /kilitli, nasıl kazanılır/ })).toHaveLength(9);
  });

  it('yükleniyor durumunu sade gösterir', async () => {
    const services = createMockServices();
    services.badge = { getBadges: () => new Promise(() => {}) };
    await renderScreen(services);

    expect(screen.getByTestId('achievements-loading')).toBeTruthy();
    expect(screen.getByText('Pasaportun açılıyor.')).toBeTruthy();
  });

  it('hata: Türkçe mesaj gösterir, "Tekrar dene" ile yeniden yükler', async () => {
    const failing = createMockServices({ scenario: 'error' });
    const working = createMockServices();
    let healthy = false;
    const services: Services = {
      ...working,
      badge: { getBadges: () => (healthy ? working.badge.getBadges() : failing.badge.getBadges()) },
      profile: {
        ...working.profile,
        getLevelProgress: () => (healthy ? working.profile.getLevelProgress() : failing.profile.getLevelProgress()),
      },
    };
    await renderScreen(services);

    expect(await screen.findByText(/Pasaportun yüklenemedi/)).toBeTruthy();
    healthy = true;
    await fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));

    expect(await screen.findByTestId('level-name')).toHaveTextContent('Fidan');
    expect(screen.queryByText(/Pasaportun yüklenemedi/)).toBeNull();
  });

  it('kazanılmış pula dokununca Medium haptic verir ve sheet tarihi gösterir; Kapat sheet kapatır', async () => {
    await renderScreen(createMockServices());
    await screen.findByTestId('level-name');

    await fireEvent.press(screen.getByRole('button', { name: /İlk 5 km, kazanıldı/ }));

    expect(Haptics.impactAsync).toHaveBeenCalledWith('medium');
    expect(await screen.findByTestId('stamp-sheet')).toBeTruthy();
    expect(screen.getByText('23 Ağustos 2026 tarihinde kazandın.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Kapat' }));
    await waitFor(() => expect(screen.queryByTestId('stamp-sheet')).toBeNull());
  });

  it('kilitli pula dokununca Light haptic verir ve sheet nasıl kazanılacağını söyler', async () => {
    await renderScreen(createMockServices());
    await screen.findByTestId('level-name');

    await fireEvent.press(screen.getByRole('button', { name: /Yarı maraton, kilitli/ }));

    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
    expect(await screen.findByText('Nasıl kazanılır: Tek seferde 21,1 km koş.')).toBeTruthy();

    // Arka plana dokunmak da sheet'i kapatır; ama arka plan ekran okuyucuya görünmez.
    expect(screen.queryByTestId('stamp-backdrop')).toBeNull();
    await fireEvent.press(screen.getByTestId('stamp-backdrop', { includeHiddenElements: true }));
    await waitFor(() => expect(screen.queryByTestId('stamp-sheet')).toBeNull());
  });

  it('Android geri tuşu (onRequestClose) sheet kapatır; açılınca ekran okuyucu odağı içeriğe gider', async () => {
    await renderScreen(createMockServices());
    await screen.findByTestId('level-name');

    await fireEvent.press(screen.getByRole('button', { name: /Erken kuş, kazanıldı/ }));
    expect(await screen.findByTestId('stamp-sheet')).toBeTruthy();
    await waitFor(() => expect(focusAccessibility).toHaveBeenCalledWith(expect.anything()));

    await act(async () => {
      screen.getByTestId('stamp-modal').props.onRequestClose();
    });
    await waitFor(() => expect(screen.queryByTestId('stamp-sheet')).toBeNull());
  });

  it('sekme yeniden odaklanınca sessizce yeniler; yenileme hatası eski veriyi silmez', async () => {
    const services = createMockServices();
    const getBadges = jest.spyOn(services.badge, 'getBadges');
    await renderScreen(services);
    expect(await screen.findByTestId('level-name')).toHaveTextContent('Fidan');

    getBadges.mockRejectedValueOnce(new Error('ağ yok'));
    await act(async () => {
      mockFocusCallback?.();
    });

    await waitFor(() => expect(getBadges).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId('achievements-loading')).toBeNull();
    expect(screen.queryByTestId('achievements-error')).toBeNull();
    expect(screen.getByTestId('level-name')).toHaveTextContent('Fidan');
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';

import { profileTr } from '@/i18n';
import { createMockServices, ServiceError, ServicesProvider, type MockScenario, type Services } from '@/services';

import { ProfileScreen } from './ProfileScreen';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

// Ekran bir navigator dışında render edilir; odak etkisi mount'ta bir kez çalışır. Odaklanma ayrı dosyada test edilir.
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return { useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]) };
});

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.2.3' } },
}));

async function renderProfile(services: Services, onSignOut?: () => void) {
  await render(
    <ServicesProvider services={services}>
      <ProfileScreen onSignOut={onSignOut} />
    </ServicesProvider>,
  );
}

async function renderScenario(scenario: MockScenario = 'default') {
  const services = createMockServices({ scenario });
  await renderProfile(services);
  return services;
}

const radio = (name: string, selected?: boolean) =>
  screen.getByRole('radio', selected === undefined ? { name } : { name, selected });

beforeEach(() => jest.clearAllMocks());

describe('ProfileScreen, varsayılan veri', () => {
  it('ad, seviye, "beri" satırı ve karne sayılarını gösterir', async () => {
    const services = createMockServices();
    const profile = await services.profile.getProfile();
    await renderProfile(services);

    expect(await screen.findByRole('header', { name: 'Elif' })).toBeTruthy();
    expect(screen.getByText('E', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText(profileTr.levels.sapling)).toBeTruthy();
    expect(screen.getByText("Ağustos 2026'dan beri")).toBeTruthy();
    // Mock aktivitelerin toplamı 147,6 km = 7 ağaç.
    expect(screen.getByLabelText(`147,6 ${profileTr.stats.km}`)).toBeTruthy();
    expect(screen.getByLabelText(`7 ${profileTr.stats.trees}`)).toBeTruthy();
    expect(screen.getByLabelText(`${profile.activeDays} ${profileTr.stats.days}`)).toBeTruthy();
    expect(screen.queryByText(profileTr.stats.emptyHint)).toBeNull();
  });

  it('avatar süs olduğu için ekran okuyucudan gizlenir', async () => {
    await renderScenario();
    await screen.findByText('Elif');
    expect(screen.queryByTestId('organic-avatar')).toBeNull();
    expect(screen.getByTestId('organic-avatar', { includeHiddenElements: true })).toBeTruthy();
  });

  it('gizlilik seçimini radyo olarak gösterir; seçim değişince servise yazar ve Light haptic verir', async () => {
    const services = createMockServices();
    const setVisibility = jest.spyOn(services.privacy, 'setVisibility');
    await renderProfile(services);
    await screen.findByText('Elif');

    expect(radio('Arkadaşlar', true)).toBeTruthy();
    expect(screen.getByText(profileTr.privacy.visibilityHint.friends)).toBeTruthy();

    await fireEvent.press(radio('Sadece ben'));

    expect(radio('Sadece ben', true)).toBeTruthy();
    expect(radio('Arkadaşlar', false)).toBeTruthy();
    expect(screen.getByText(profileTr.privacy.visibilityHint.private)).toBeTruthy();
    expect(setVisibility).toHaveBeenCalledWith('private');
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
    await waitFor(async () => expect((await services.privacy.getSettings()).visibility).toBe('private'));
  });

  it('seçili seçeneğe tekrar dokunmak servisi çağırmaz', async () => {
    const services = createMockServices();
    const setVisibility = jest.spyOn(services.privacy, 'setVisibility');
    await renderProfile(services);
    await screen.findByText('Elif');

    await fireEvent.press(radio('Arkadaşlar'));

    expect(setVisibility).not.toHaveBeenCalled();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('kayıt başarısız olursa seçimi geri alır ve Türkçe mesaj gösterir', async () => {
    const services = createMockServices();
    services.privacy.setVisibility = jest.fn().mockRejectedValue(new ServiceError('network', 'Sunucuya ulaşılamadı.'));
    await renderProfile(services);
    await screen.findByText('Elif');

    await fireEvent.press(radio('Herkes'));

    expect(await screen.findByText(profileTr.privacy.visibilityError)).toBeTruthy();
    expect(radio('Arkadaşlar', true)).toBeTruthy();
    expect(radio('Herkes', false)).toBeTruthy();
  });

  it('gizlilik bölgelerini etiket ve yarıçapla listeler, rota açıklamasını yazar', async () => {
    await renderScenario();
    await screen.findByText('Elif');

    expect(screen.getByLabelText('Ev, 300 metre')).toBeTruthy();
    expect(screen.getByLabelText('İş, 200 metre')).toBeTruthy();
    expect(screen.getByText(profileTr.privacy.zonesExplain)).toBeTruthy();
    expect(screen.queryByText(profileTr.privacy.zonesEmpty)).toBeNull();
  });

  it('bölge ekler: ad + yarıçap seçilir, liste güncellenir ve Success haptic verir', async () => {
    const services = createMockServices();
    const addZone = jest.spyOn(services.privacy, 'addZone');
    await renderProfile(services);
    await screen.findByText('Elif');

    await fireEvent.press(screen.getByRole('button', { name: profileTr.privacy.addZone }));
    await fireEvent.changeText(screen.getByLabelText(profileTr.privacy.zoneName), 'Spor salonu');
    await fireEvent.press(screen.getByRole('radio', { name: 'Yarıçap, 500 metre' }));
    await fireEvent.press(screen.getByRole('button', { name: profileTr.privacy.zoneSave }));

    expect(await screen.findByLabelText('Spor salonu, 500 metre')).toBeTruthy();
    expect(addZone).toHaveBeenCalledWith(expect.objectContaining({ label: 'Spor salonu', radiusM: 500 }));
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    // Form kapanır, "Bölge ekle" geri gelir.
    expect(screen.queryByLabelText(profileTr.privacy.zoneName)).toBeNull();
    expect(screen.getByRole('button', { name: profileTr.privacy.addZone })).toBeTruthy();
    expect((await services.privacy.getSettings()).zones).toHaveLength(3);
  });

  it('boş ad servis doğrulamasına takılır: mesaj gösterilir, form açık kalır, haptic yok', async () => {
    const services = createMockServices();
    await renderProfile(services);
    await screen.findByText('Elif');

    await fireEvent.press(screen.getByRole('button', { name: profileTr.privacy.addZone }));
    await fireEvent.press(screen.getByRole('button', { name: profileTr.privacy.zoneSave }));

    expect(await screen.findByText('Bölgeye bir ad ver.')).toBeTruthy();
    expect(screen.getByLabelText(profileTr.privacy.zoneName)).toBeTruthy();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    expect((await services.privacy.getSettings()).zones).toHaveLength(2);
  });

  it('ağ hatasında bölge eklemek genel Türkçe mesaj gösterir; vazgeç formu kapatır', async () => {
    const services = createMockServices();
    services.privacy.addZone = jest.fn().mockRejectedValue(new ServiceError('network', 'ham hata'));
    await renderProfile(services);
    await screen.findByText('Elif');

    await fireEvent.press(screen.getByRole('button', { name: profileTr.privacy.addZone }));
    await fireEvent.changeText(screen.getByLabelText(profileTr.privacy.zoneName), 'Okul');
    await fireEvent.press(screen.getByRole('button', { name: profileTr.privacy.zoneSave }));
    expect(await screen.findByText(profileTr.privacy.zoneAddError)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: profileTr.privacy.zoneCancel }));
    expect(screen.queryByLabelText(profileTr.privacy.zoneName)).toBeNull();
    expect(screen.queryByText(profileTr.privacy.zoneAddError)).toBeNull();
  });

  it('bölgeyi ikinci dokunuşta siler ve Medium haptic verir', async () => {
    const services = createMockServices();
    await renderProfile(services);
    await screen.findByText('Elif');

    await fireEvent.press(screen.getByRole('button', { name: 'Sil, Ev' }));
    // İlk dokunuş sadece onay ister; düğmenin adı ve değeri de değişir.
    expect(screen.getByText(profileTr.privacy.zoneRemoveConfirm)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Sil, Ev' })).toBeNull();
    expect(screen.getByLabelText('Ev, 300 metre')).toBeTruthy();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Silmek için tekrar dokun, Ev' }));

    await waitFor(() => expect(screen.queryByLabelText('Ev, 300 metre')).toBeNull());
    expect(screen.getByLabelText('İş, 200 metre')).toBeTruthy();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('medium');
    expect((await services.privacy.getSettings()).zones.map((z) => z.label)).toEqual(['İş']);
  });

  it('silme başarısız olursa bölge listede kalır ve mesaj gösterilir', async () => {
    const services = createMockServices();
    services.privacy.removeZone = jest.fn().mockRejectedValue(new ServiceError('network', 'ham hata'));
    await renderProfile(services);
    await screen.findByText('Elif');

    await fireEvent.press(screen.getByRole('button', { name: 'Sil, Ev' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Silmek için tekrar dokun, Ev' }));

    expect(await screen.findByText(profileTr.privacy.zoneRemoveError)).toBeTruthy();
    expect(screen.getByLabelText('Ev, 300 metre')).toBeTruthy();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it('onSignOut verilmezse "Çıkış yap" satırı yoktur, sürüm satırı kalır', async () => {
    await renderProfile(createMockServices());
    await screen.findByText('Elif');

    expect(screen.queryByRole('button', { name: profileTr.signOut.action })).toBeNull();
    expect(screen.getByText('Sürüm 1.2.3')).toBeTruthy();
  });

  it('onSignOut verilirse önce onay Alert\'i açar, onaylanınca çağırır', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onSignOut = jest.fn();
    await renderProfile(createMockServices(), onSignOut);
    await screen.findByText('Elif');

    await fireEvent.press(screen.getByRole('button', { name: profileTr.signOut.action }));

    expect(alert).toHaveBeenCalledTimes(1);
    expect(onSignOut).not.toHaveBeenCalled();
    const [title, , buttons] = alert.mock.calls[0];
    expect(title).toBe(profileTr.signOut.title);
    buttons?.find((b) => b.style === 'destructive')?.onPress?.();
    expect(onSignOut).toHaveBeenCalledTimes(1);
    alert.mockRestore();
  });

  it('görünürlük: A→B sonra B→C, C hata verirse son onaylı duruma (B) döner', async () => {
    const services = createMockServices();
    let resolveFirst: (value: { visibility: 'public'; zones: [] }) => void = () => {};
    const setVisibility = jest
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
      .mockRejectedValueOnce(new ServiceError('network', 'ham hata'));
    services.privacy.setVisibility = setVisibility;
    await renderProfile(services);
    await screen.findByText('Elif');

    await fireEvent.press(radio('Herkes')); // A (friends) -> B (public), yanıt bekleniyor
    await fireEvent.press(radio('Sadece ben')); // B -> C (private), sıraya girer
    expect(radio('Sadece ben', true)).toBeTruthy();
    // İstekler sıralı: ikincisi birincinin yanıtını bekler.
    expect(setVisibility).toHaveBeenCalledTimes(1);

    resolveFirst({ visibility: 'public', zones: [] });

    expect(await screen.findByText(profileTr.privacy.visibilityError)).toBeTruthy();
    expect(setVisibility).toHaveBeenNthCalledWith(2, 'private');
    expect(radio('Herkes', true)).toBeTruthy();
    expect(radio('Sadece ben', false)).toBeTruthy();
  });

  it('görünürlük: eski istek hata verip en yeni istek başarılı olursa son seçim kalır, hata gösterilmez', async () => {
    const services = createMockServices();
    let rejectFirst: (error: Error) => void = () => {};
    services.privacy.setVisibility = jest
      .fn()
      .mockImplementationOnce(() => new Promise((_, reject) => (rejectFirst = reject)))
      .mockResolvedValueOnce({ visibility: 'private', zones: [] });
    await renderProfile(services);
    await screen.findByText('Elif');

    await fireEvent.press(radio('Herkes'));
    await fireEvent.press(radio('Sadece ben'));
    rejectFirst(new ServiceError('network', 'ham hata'));

    await waitFor(() => expect(services.privacy.setVisibility).toHaveBeenCalledTimes(2));
    expect(radio('Sadece ben', true)).toBeTruthy();
    expect(screen.queryByText(profileTr.privacy.visibilityError)).toBeNull();
  });
});

describe('ProfileScreen, durumlar', () => {
  it('yüklenirken sade bir metin gösterir', async () => {
    await renderProfile(createMockServices({ latencyMs: 50 }));
    expect(screen.getByText(profileTr.loading)).toBeTruthy();
    expect(await screen.findByText('Elif')).toBeTruthy();
    expect(screen.queryByText(profileTr.loading)).toBeNull();
  });

  it('yeni kullanıcıda sayılar 0, bölge yok mesajı ve ilk adım ipucu görünür', async () => {
    await renderScenario('empty');

    expect(await screen.findByText(profileTr.privacy.zonesEmpty)).toBeTruthy();
    expect(screen.getByLabelText(`0 ${profileTr.stats.km}`)).toBeTruthy();
    expect(screen.getByLabelText(`0 ${profileTr.stats.trees}`)).toBeTruthy();
    expect(screen.getByLabelText(`0 ${profileTr.stats.days}`)).toBeTruthy();
    expect(screen.getByText(profileTr.stats.emptyHint)).toBeTruthy();
    expect(screen.getByText(profileTr.levels.seed)).toBeTruthy();
    expect(screen.queryByText(/beri$/)).toBeNull();
    // Bölge ekleme yine mümkün.
    expect(screen.getByRole('button', { name: profileTr.privacy.addZone })).toBeTruthy();
  });

  it('hata durumunda Türkçe mesaj ve "Tekrar dene" gösterir; tekrar dene yeniden dener', async () => {
    await renderScenario('error');

    expect(await screen.findByText(profileTr.loadError)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: profileTr.retry }));
    // Servis hâlâ hatalı: yeniden hata durumuna döner.
    expect(await screen.findByText(profileTr.loadError)).toBeTruthy();
  });

  it('"Tekrar dene" servis düzelince ekranı açar', async () => {
    const services = createMockServices();
    const realGetProfile = services.profile.getProfile;
    let failing = true;
    services.profile.getProfile = async () => {
      if (failing) throw new ServiceError('network', 'Sunucuya ulaşılamadı.');
      return realGetProfile();
    };
    await renderProfile(services);
    expect(await screen.findByText(profileTr.loadError)).toBeTruthy();

    failing = false;
    await fireEvent.press(screen.getByRole('button', { name: profileTr.retry }));

    expect(await screen.findByText('Elif')).toBeTruthy();
    expect(screen.queryByText(profileTr.loadError)).toBeNull();
  });

  it('"beri" satırı alınamazsa ekran yine açılır', async () => {
    const services = createMockServices();
    services.activity.getActivities = jest.fn().mockRejectedValue(new ServiceError('network', 'x'));
    await renderProfile(services);

    expect(await screen.findByText('Elif')).toBeTruthy();
    expect(screen.queryByText(/beri$/)).toBeNull();
  });
});

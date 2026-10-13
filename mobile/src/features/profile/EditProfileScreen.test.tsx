import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { router } from 'expo-router';
import { processColor, Text } from 'react-native';

import EditProfileRoute from '@/app/edit-profile';
import { fill, profileTr } from '@/i18n';
import { createMockServices, ServiceError, ServicesProvider, type Services } from '@/services';
import type { Profile } from '@/types';

import { avatarColor } from './avatarShape';
import { confirmAction } from './confirmAction';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('./confirmAction', () => ({ confirmAction: jest.fn() }));

const confirm = confirmAction as jest.Mock;
const edit = profileTr.edit;

async function renderEdit(services: Services = createMockServices(), options: { expectForm?: boolean } = {}) {
  const app = renderRouter(
    {
      index: () => <Text>Ana ekran</Text>,
      'edit-profile': () => (
        <ServicesProvider services={services}>
          <EditProfileRoute />
        </ServicesProvider>
      ),
    },
    { initialUrl: '/' },
  );
  await app;
  await act(async () => router.push('/edit-profile' as never));
  if (options.expectForm !== false) await screen.findByRole('header', { name: edit.title });
  return { services, app };
}

const nameInput = () => screen.getByLabelText(edit.name);
const saveButton = () => screen.getByRole('button', { name: edit.save });
const avatarLetter = (letter: string) => screen.getByText(letter, { includeHiddenElements: true });
const avatarFill = () =>
  screen.getByTestId('organic-avatar-shape', { includeHiddenElements: true }).props.fill?.payload;
const isDisabled = (element: ReturnType<typeof saveButton>) => element.props.accessibilityState?.disabled === true;

beforeEach(() => jest.clearAllMocks());

describe('Profili düzenle', () => {
  it('başlığı, mevcut adı ve varsayılan avatar harfini gösterir; değişiklik yokken Kaydet kapalıdır', async () => {
    await renderEdit();

    expect(nameInput().props.value).toBe('Elif');
    expect(screen.getByText(fill(edit.avatarValue, { label: edit.avatarFromName, letter: 'E' }))).toBeTruthy();
    expect(avatarLetter('E')).toBeTruthy();
    expect(isDisabled(saveButton())).toBe(true);
    // Şemada olmayan alanlar gösterilmez.
    expect(screen.queryByLabelText(/kullanıcı adı|biyografi/i)).toBeNull();
  });

  it('ad yazıldıkça avatar harfi ve rengi canlı güncellenir (i -> İ)', async () => {
    await renderEdit();
    expect(avatarFill()).toBe(processColor(avatarColor('Elif')));

    await fireEvent.changeText(nameInput(), 'ismail');

    expect(avatarLetter('İ')).toBeTruthy();
    expect(avatarFill()).toBe(processColor(avatarColor('ismail')));
    expect(screen.getByText(fill(edit.avatarValue, { label: edit.avatarFromName, letter: 'İ' }))).toBeTruthy();
    expect(isDisabled(saveButton())).toBe(false);
  });

  it('kırpılmış ad kayıtlı adla aynıysa değişiklik sayılmaz', async () => {
    await renderEdit();
    await fireEvent.changeText(nameInput(), '  Elif  ');
    expect(isDisabled(saveButton())).toBe(true);
  });

  it('boş ad: alan terk edilince satır içi mesaj çıkar, kaydetme servise gitmez', async () => {
    const { services } = await renderEdit();
    const updateProfile = jest.spyOn(services.profile, 'updateProfile');

    await fireEvent.changeText(nameInput(), '   ');
    expect(screen.queryByText(edit.nameErrors.blank)).toBeNull();
    await fireEvent(nameInput(), 'blur');
    expect(screen.getByText(edit.nameErrors.blank)).toBeTruthy();

    await fireEvent.press(saveButton());
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('tek karakterli ad kaydetmeyi denerken "en az 2 karakter" der', async () => {
    const { services } = await renderEdit();
    const updateProfile = jest.spyOn(services.profile, 'updateProfile');

    await fireEvent.changeText(nameInput(), 'A');
    await fireEvent.press(saveButton());

    expect(screen.getByText('Ad en az 2 karakter olmalı.')).toBeTruthy();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('40 karakterden uzun ad hemen uyarılır; sayaç gösterilmez; 40 karakter kabul edilir', async () => {
    await renderEdit();

    await fireEvent.changeText(nameInput(), 'a'.repeat(41));
    expect(screen.getByText('Ad en fazla 40 karakter olabilir.')).toBeTruthy();
    expect(screen.queryByText(/41|40\/|\/40/)).toBeNull();

    await fireEvent.changeText(nameInput(), 'a'.repeat(40));
    expect(screen.queryByText('Ad en fazla 40 karakter olabilir.')).toBeNull();
  });

  it('40 Türkçe harf (ş) sınır içindedir', async () => {
    await renderEdit();
    await fireEvent.changeText(nameInput(), 'ş'.repeat(40));
    expect(screen.queryByText('Ad en fazla 40 karakter olabilir.')).toBeNull();
  });

  it('sıfır genişlikli ve kontrol karakterli adı reddeder', async () => {
    const { services } = await renderEdit();
    const updateProfile = jest.spyOn(services.profile, 'updateProfile');

    await fireEvent.changeText(nameInput(), 'Ay​şe');
    await fireEvent.press(saveButton());

    expect(screen.getByText(edit.nameErrors.forbidden)).toBeTruthy();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('başarılı kayıt: kırpılmış ad ve türetilen harf servise gider, ekran kapanır', async () => {
    const { services } = await renderEdit();
    const updateProfile = jest.spyOn(services.profile, 'updateProfile');

    await fireEvent.changeText(nameInput(), '  Ayşe  ');
    await fireEvent.press(saveButton());

    await waitFor(() => expect(screen.getByText('Ana ekran')).toBeTruthy());
    expect(updateProfile).toHaveBeenCalledWith({ name: 'Ayşe', avatarInitial: 'A' });
    expect(await services.profile.getProfile()).toMatchObject({ name: 'Ayşe', avatarInitial: 'A' });
    // Başarıda çıkış onayı sorulmaz.
    expect(confirm).not.toHaveBeenCalled();
  });

  it('kaydedilirken buton "Kaydediliyor" olur ve ikinci dokunuş ikinci istek atmaz', async () => {
    const services = createMockServices({ latencyMs: 30 });
    const { services: s } = await renderEdit(services);
    const updateProfile = jest.spyOn(s.profile, 'updateProfile');

    await fireEvent.changeText(nameInput(), 'Ayşe');
    await fireEvent.press(saveButton());

    const busy = screen.getByRole('button', { name: edit.saving });
    expect(busy.props.accessibilityState).toMatchObject({ disabled: true, busy: true });
    await fireEvent.press(busy);
    await waitFor(() => expect(screen.getByText('Ana ekran')).toBeTruthy());
    expect(updateProfile).toHaveBeenCalledTimes(1);
  });

  it('kayıt hatası: Türkçe mesaj gösterilir, form korunur, tekrar denenebilir', async () => {
    const services = createMockServices();
    const real = services.profile.updateProfile;
    let failing = true;
    services.profile.updateProfile = jest.fn(async (patch) => {
      if (failing) throw new ServiceError('network', 'iç ayrıntı');
      return real(patch);
    });
    await renderEdit(services);

    await fireEvent.changeText(nameInput(), 'Ayşe');
    await fireEvent.press(saveButton());

    expect(await screen.findByText(edit.saveErrors.network)).toBeTruthy();
    expect(screen.queryByText('iç ayrıntı')).toBeNull();
    expect(nameInput().props.value).toBe('Ayşe');
    expect(screen.queryByText('Ana ekran')).toBeNull();
    expect(isDisabled(saveButton())).toBe(false);

    failing = false;
    await fireEvent.press(saveButton());
    await waitFor(() => expect(screen.getByText('Ana ekran')).toBeTruthy());
  });

  it('sunucu "invalid" derse genel Türkçe mesaj gösterir', async () => {
    const services = createMockServices();
    services.profile.updateProfile = jest.fn().mockRejectedValue(new ServiceError('invalid', 'x'));
    await renderEdit(services);

    await fireEvent.changeText(nameInput(), 'Ayşe');
    await fireEvent.press(saveButton());

    expect(await screen.findByText(edit.saveErrors.invalid)).toBeTruthy();
  });

  it('"Başka harf seç": tek harf alanı açılır, son yazılan karakter eskisinin yerini alır, büyük harfe çevrilir', async () => {
    await renderEdit();

    await fireEvent.press(screen.getByRole('link', { name: edit.pickOther }));
    const letter = screen.getByLabelText(edit.letterField);
    expect(letter.props.value).toBe('E');

    await fireEvent.changeText(letter, 'Ei');
    expect(screen.getByLabelText(edit.letterField).props.value).toBe('İ');
    expect(avatarLetter('İ')).toBeTruthy();
    expect(isDisabled(saveButton())).toBe(false);
  });

  it('seçilen harf yalnız avatarInitial olarak kaydedilir (ad değişmediyse ad gitmez)', async () => {
    const { services } = await renderEdit();
    const updateProfile = jest.spyOn(services.profile, 'updateProfile');

    await fireEvent.press(screen.getByRole('link', { name: edit.pickOther }));
    await fireEvent.changeText(screen.getByLabelText(edit.letterField), '7');
    await fireEvent.press(saveButton());

    await waitFor(() => expect(screen.getByText('Ana ekran')).toBeTruthy());
    expect(updateProfile).toHaveBeenCalledWith({ avatarInitial: '7' });
  });

  it('harf alanına harf/rakam olmayan karakter yazılırsa satır içi mesaj çıkar ve kayıt gitmez', async () => {
    const { services } = await renderEdit();
    const updateProfile = jest.spyOn(services.profile, 'updateProfile');

    await fireEvent.press(screen.getByRole('link', { name: edit.pickOther }));
    await fireEvent.changeText(screen.getByLabelText(edit.letterField), '!');
    expect(screen.getByText(edit.letterError)).toBeTruthy();

    await fireEvent.press(saveButton());
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('harf alanı boşaltılıp kaydedilirse mesaj çıkar', async () => {
    await renderEdit();
    await fireEvent.press(screen.getByRole('link', { name: edit.pickOther }));
    await fireEvent.changeText(screen.getByLabelText(edit.letterField), '');
    expect(screen.queryByText(edit.letterError)).toBeNull();

    await fireEvent.press(saveButton());
    expect(screen.getByText(edit.letterError)).toBeTruthy();
  });

  it('"Adın baş harfini kullan" varsayılana döner; ad değişince harf adı izler', async () => {
    await renderEdit();
    await fireEvent.press(screen.getByRole('link', { name: edit.pickOther }));
    await fireEvent.changeText(screen.getByLabelText(edit.letterField), 'Z');
    await fireEvent.press(screen.getByRole('link', { name: edit.useName }));

    expect(screen.queryByLabelText(edit.letterField)).toBeNull();
    expect(isDisabled(saveButton())).toBe(true);
    await fireEvent.changeText(nameInput(), 'Mert');
    expect(avatarLetter('M')).toBeTruthy();
  });

  it('profildeki harf addan farklıysa form seçili harfle (elle seçilmiş) açılır', async () => {
    const services = createMockServices();
    const real = services.profile.getProfile;
    services.profile.getProfile = async (): Promise<Profile> => ({ ...(await real()), avatarInitial: 'X' });
    await renderEdit(services);

    expect(screen.getByLabelText(edit.letterField).props.value).toBe('X');
  });

  it('değişiklik yokken Vazgeç onaysız geri döner', async () => {
    await renderEdit();
    await fireEvent.press(screen.getByRole('button', { name: edit.cancel }));
    await waitFor(() => expect(screen.getByText('Ana ekran')).toBeTruthy());
    expect(confirm).not.toHaveBeenCalled();
  });

  it('kaydedilmemiş değişiklik varken Vazgeç onay ister; "Düzenlemeye dön" ekranda tutar', async () => {
    await renderEdit();
    await fireEvent.changeText(nameInput(), 'Ayşe');

    await fireEvent.press(screen.getByRole('button', { name: edit.cancel }));

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: edit.discard.title,
        message: edit.discard.message,
        confirmLabel: edit.discard.confirm,
        cancelLabel: edit.discard.cancel,
      }),
    );
    expect(screen.queryByText('Ana ekran')).toBeNull();
    expect(nameInput().props.value).toBe('Ayşe');
  });

  it('onaylanırsa değişiklikler atılır ve geri dönülür; servis çağrılmaz', async () => {
    const { services } = await renderEdit();
    const updateProfile = jest.spyOn(services.profile, 'updateProfile');
    await fireEvent.changeText(nameInput(), 'Ayşe');

    await fireEvent.press(screen.getByRole('button', { name: edit.cancel }));
    await act(async () => confirm.mock.calls[0][0].onConfirm());

    await waitFor(() => expect(screen.getByText('Ana ekran')).toBeTruthy());
    expect(updateProfile).not.toHaveBeenCalled();
    expect((await services.profile.getProfile()).name).toBe('Elif');
  });

  it('geri hareketi/tuşu da aynı onayı ister', async () => {
    await renderEdit();
    await fireEvent.changeText(nameInput(), 'Ayşe');

    await act(async () => router.back());

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Ana ekran')).toBeNull();
  });

  it('yükleme hatasında mesaj ve "Tekrar dene" gösterir; servis düzelince form açılır', async () => {
    const services = createMockServices();
    const real = services.profile.getProfile;
    let failing = true;
    services.profile.getProfile = async () => {
      if (failing) throw new ServiceError('network', 'x');
      return real();
    };
    const app = renderRouter(
      {
        index: () => <Text>Ana ekran</Text>,
        'edit-profile': () => (
          <ServicesProvider services={services}>
            <EditProfileRoute />
          </ServicesProvider>
        ),
      },
      { initialUrl: '/' },
    );
    await app;
    await act(async () => router.push('/edit-profile' as never));
    expect(await screen.findByText(edit.loadError)).toBeTruthy();

    failing = false;
    await fireEvent.press(screen.getByRole('button', { name: profileTr.retry }));

    expect(await screen.findByRole('header', { name: edit.title })).toBeTruthy();
    expect(nameInput().props.value).toBe('Elif');
  });

  it('yükleme hatası görünümünde de Vazgeç (geri) düğmesi vardır', async () => {
    const services = createMockServices({ scenario: 'error' });
    await renderEdit(services, { expectForm: false });
    expect(await screen.findByText(edit.loadError)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: edit.cancel }));
    await waitFor(() => expect(screen.getByText('Ana ekran')).toBeTruthy());
  });

  it('yükleniyor görünümünde de Vazgeç düğmesi vardır', async () => {
    const services = createMockServices({ latencyMs: 200 });
    await renderEdit(services, { expectForm: false });
    expect(screen.getByText(edit.loading)).toBeTruthy();
    expect(screen.getByRole('button', { name: edit.cancel })).toBeTruthy();
  });
});

describe('Profili düzenle, kayıt yarışları', () => {
  function deferredService() {
    const services = createMockServices();
    const real = services.profile.updateProfile;
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    services.profile.updateProfile = jest.fn(async (patch) => {
      await gate;
      return real(patch);
    });
    return { services, release };
  }

  async function renderStack(services: Services) {
    const Wrapped = () => (
      <ServicesProvider services={services}>
        <EditProfileRoute />
      </ServicesProvider>
    );
    const app = renderRouter(
      { index: () => <Text>Ana ekran</Text>, ikinci: () => <Text>İkinci ekran</Text>, 'edit-profile': Wrapped },
      { initialUrl: '/' },
    );
    await app;
    await act(async () => router.push('/ikinci' as never));
    await act(async () => router.push('/edit-profile' as never));
    await screen.findByRole('header', { name: edit.title });
  }

  it('kayıt sürerken geri/Vazgeç ekranı kapatmaz ve onay sormaz; kayıt bitince tek kez geri döner', async () => {
    const { services, release } = deferredService();
    await renderStack(services);
    await fireEvent.changeText(nameInput(), 'Ayşe');
    await fireEvent.press(saveButton());

    await act(async () => router.back());
    await fireEvent.press(screen.getByRole('button', { name: edit.cancel }));
    expect(confirm).not.toHaveBeenCalled();
    expect(screen.queryByText('İkinci ekran')).toBeNull();
    expect(nameInput().props.value).toBe('Ayşe');

    await act(async () => release());
    // Tek geri: Ana ekran'a değil, bir önceki ekrana (İkinci) dönülür.
    await waitFor(() => expect(screen.getByText('İkinci ekran')).toBeTruthy());
    expect(screen.queryByText('Ana ekran')).toBeNull();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('aynı tick içinde iki kez gönderilse tek updateProfile çağrılır', async () => {
    const services = createMockServices();
    await renderEdit(services);
    const updateProfile = jest.spyOn(services.profile, 'updateProfile');
    await fireEvent.changeText(nameInput(), 'Ayşe');

    await act(async () => {
      const input = nameInput();
      input.props.onSubmitEditing();
      input.props.onSubmitEditing();
    });

    expect(updateProfile).toHaveBeenCalledTimes(1);
  });

  it('kayıt sürerken ekran kapanırsa (unmount) kayıt bitince geri çağrılmaz, hata da fırlamaz', async () => {
    const { services, release } = deferredService();
    const { app } = await renderEdit(services);
    await fireEvent.changeText(nameInput(), 'Ayşe');
    await fireEvent.press(saveButton());
    // Ekran dışarıdan kapanır (ör. oturum kapanması): rota kaldırılır.
    await act(async () => router.dismissAll());
    await act(async () => release());
    expect(app.getPathname()).toBe('/');
  });

  it('geçmişsiz açılışta (derin bağlantı) Kaydet Profil sekmesine gider ve buton takılı kalmaz', async () => {
    const services = createMockServices();
    const app = renderRouter(
      {
        index: () => <Text>Ana ekran</Text>,
        '(tabs)/profile': () => <Text>Profil sayfası</Text>,
        'edit-profile': () => (
          <ServicesProvider services={services}>
            <EditProfileRoute />
          </ServicesProvider>
        ),
      },
      { initialUrl: '/edit-profile' },
    );
    await app;
    await screen.findByRole('header', { name: edit.title });
    await fireEvent.changeText(nameInput(), 'Ayşe');
    await fireEvent.press(saveButton());

    await waitFor(() => expect(screen.getByText('Profil sayfası')).toBeTruthy());
    expect(app.getPathname()).toBe('/profile');
  });

  it('geçmişsiz açılışta Vazgeç Profil sekmesine gider', async () => {
    const services = createMockServices();
    const app = renderRouter(
      {
        index: () => <Text>Ana ekran</Text>,
        '(tabs)/profile': () => <Text>Profil sayfası</Text>,
        'edit-profile': () => (
          <ServicesProvider services={services}>
            <EditProfileRoute />
          </ServicesProvider>
        ),
      },
      { initialUrl: '/edit-profile' },
    );
    await app;
    await screen.findByRole('header', { name: edit.title });
    await fireEvent.press(screen.getByRole('button', { name: edit.cancel }));
    await waitFor(() => expect(screen.getByText('Profil sayfası')).toBeTruthy());
  });

  it('başarılı kayıttan sonra Kaydet etkinleşmez (kilitli kalır) ve ikinci kayıt gitmez', async () => {
    const services = createMockServices();
    await renderEdit(services);
    const updateProfile = jest.spyOn(services.profile, 'updateProfile');
    await fireEvent.changeText(nameInput(), 'Ayşe');
    await fireEvent.press(saveButton());
    await waitFor(() => expect(screen.getByText('Ana ekran')).toBeTruthy());
    expect(updateProfile).toHaveBeenCalledTimes(1);
  });
});

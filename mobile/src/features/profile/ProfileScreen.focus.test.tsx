import { Tabs } from 'expo-router';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { profileTr } from '@/i18n';
import { createMockServices, ServiceError, ServicesProvider, type Services } from '@/services';

import { ProfileScreen } from './ProfileScreen';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

async function renderTabs(services: Services) {
  await renderRouter(
    {
      _layout: () => <Tabs screenOptions={{ headerShown: false }} />,
      index: () => <Text>Ana sayfa</Text>,
      profile: () => (
        <ServicesProvider services={services}>
          <ProfileScreen />
        </ServicesProvider>
      ),
    },
    { initialUrl: '/' },
  );
}

describe('ProfileScreen, sekme odağı', () => {
  it('sekmeye her dönüşte veriyi sessizce yeniler; içerik yükleniyor durumuna düşmez', async () => {
    const services = createMockServices();
    const getProfile = jest.spyOn(services.profile, 'getProfile');
    await renderTabs(services);
    // Sekme tembel açılır: odaklanmadan yükleme yok.
    expect(getProfile).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText('profile'));
    expect(await screen.findByText('Elif')).toBeTruthy();
    expect(getProfile).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByText('index'));
    // Başka yerde değişen ayar.
    await services.privacy.setVisibility('public');
    await fireEvent.press(screen.getByText('profile'));

    expect(screen.queryByText(profileTr.loading)).toBeNull();
    await waitFor(() => expect(getProfile).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Herkes', selected: true })).toBeTruthy());
  });

  it('yenileme başarısız olursa mevcut içerik korunur', async () => {
    const services = createMockServices();
    await renderTabs(services);
    await fireEvent.press(screen.getByText('profile'));
    await screen.findByText('Elif');

    services.profile.getProfile = jest.fn().mockRejectedValue(new ServiceError('network', 'x'));
    await fireEvent.press(screen.getByText('index'));
    await fireEvent.press(screen.getByText('profile'));

    await waitFor(() => expect(services.profile.getProfile).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Elif')).toBeTruthy();
    expect(screen.queryByText(profileTr.loadError)).toBeNull();
  });
});

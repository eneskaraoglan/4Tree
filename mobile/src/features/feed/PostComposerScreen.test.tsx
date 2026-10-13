import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { trFeed } from '@/i18n';
import { createMockServices, ServicesProvider, type Services } from '@/services';

import { PostComposerScreen } from './PostComposerScreen';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    push: jest.fn(),
  }),
}));

jest.mock('@/components/RouteLine', () => ({
  RouteLine: () => null,
}));

function renderScreen(services: Services, initialRunId?: string, onPostCreated?: () => void) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ServicesProvider services={services}>{children}</ServicesProvider>
  );
  return render(
    <PostComposerScreen initialRunId={initialRunId} onPostCreated={onPostCreated} />,
    { wrapper },
  );
}

describe('PostComposerScreen', () => {
  beforeEach(() => {
    mockBack.mockClear();
  });

  it('ekranı yükler ve içerik yokken Paylaş butonu devredışıdır', async () => {
    const services = createMockServices();
    await renderScreen(services);

    expect(await screen.findByRole('header', { name: trFeed.composer.title })).toBeTruthy();
    const shareBtn = screen.getByTestId('composer-share-btn');
    expect(shareBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('açıklama yazıldığında Paylaş butonu etkinleşir ve vazgeç basınca geri gider', async () => {
    const services = createMockServices();
    await renderScreen(services);

    const input = await screen.findByTestId('composer-caption-input');
    await fireEvent.changeText(input, 'Güne harika bir koşuyla başladım!');

    const shareBtn = screen.getByTestId('composer-share-btn');
    expect(shareBtn.props.accessibilityState?.disabled).toBe(false);

    const cancelBtn = screen.getByTestId('composer-cancel-btn');
    await fireEvent.press(cancelBtn);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('hızlı konum seçimi yapılabilir', async () => {
    const services = createMockServices();
    await renderScreen(services);

    const belgradChip = await screen.findByRole('button', { name: 'Belgrad Ormanı' });
    await fireEvent.press(belgradChip);

    const locationInput = screen.getByTestId('composer-location-input');
    expect(locationInput.props.value).toBe('Belgrad Ormanı');

    const shareBtn = screen.getByTestId('composer-share-btn');
    expect(shareBtn.props.accessibilityState?.disabled).toBe(false);
  });

  it('fotoğraf ekleme ve kaldırma akışını yönetir', async () => {
    const services = createMockServices();
    await renderScreen(services);

    const attachPhotoBtn = await screen.findByTestId('composer-attach-photo-btn');
    await fireEvent.press(attachPhotoBtn);

    expect(await screen.findByTestId('composer-attached-photo')).toBeTruthy();
    expect(screen.getByText(trFeed.composer.photoAttached)).toBeTruthy();

    const removeBtn = screen.getByTestId('composer-remove-photo-btn');
    await fireEvent.press(removeBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('composer-attached-photo')).toBeNull();
    });
  });

  it('koşu seçip ekleyebilir ve kaldırabilir', async () => {
    const services = createMockServices();
    await renderScreen(services);

    const attachRunBtn = await screen.findByTestId('composer-attach-run-btn');
    await fireEvent.press(attachRunBtn);

    expect(await screen.findByTestId('composer-run-picker-modal')).toBeTruthy();
    const activities = await services.activity.getActivities();
    expect(activities.length).toBeGreaterThan(0);

    const firstRunItem = await screen.findByTestId(`composer-pick-run-${activities[0].id}`);
    await fireEvent.press(firstRunItem);

    await waitFor(() => {
      expect(screen.queryByTestId('composer-run-picker-modal')).toBeNull();
    });

    expect(await screen.findByTestId('composer-attached-run')).toBeTruthy();
    expect(screen.getByText(trFeed.composer.privacyNotice)).toBeTruthy();

    const removeRunBtn = screen.getByTestId('composer-remove-run-btn');
    await fireEvent.press(removeRunBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('composer-attached-run')).toBeNull();
    });
  });

  it('yeni gönderi oluşturur, createPost çağırır ve geri döner', async () => {
    const services = createMockServices();
    const createPostSpy = jest.spyOn(services.feed, 'createPost');
    const onCreated = jest.fn();

    await renderScreen(services, undefined, onCreated);

    const input = await screen.findByTestId('composer-caption-input');
    await fireEvent.changeText(input, 'Ormanda taze hava ve güzel bir tempo.');

    const shareBtn = screen.getByTestId('composer-share-btn');
    await fireEvent.press(shareBtn);

    await waitFor(() => {
      expect(createPostSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          caption: 'Ormanda taze hava ve güzel bir tempo.',
        }),
      );
      expect(onCreated).toHaveBeenCalledTimes(1);
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    createPostSpy.mockRestore();
  });

  it('servis hatası oluştuğunda hata mesajı gösterir ve taslağı korur', async () => {
    const services = createMockServices();
    jest.spyOn(services.feed, 'createPost').mockRejectedValueOnce(new Error('Network error'));

    await renderScreen(services);

    const input = await screen.findByTestId('composer-caption-input');
    await fireEvent.changeText(input, 'Taslak kaybolmamalı.');

    const shareBtn = screen.getByTestId('composer-share-btn');
    await fireEvent.press(shareBtn);

    expect(await screen.findByTestId('composer-error-box')).toBeTruthy();
    expect(screen.getByText(trFeed.composer.errorShareFailed)).toBeTruthy();
    expect(screen.getByTestId('composer-caption-input').props.value).toBe('Taslak kaybolmamalı.');
  });
});

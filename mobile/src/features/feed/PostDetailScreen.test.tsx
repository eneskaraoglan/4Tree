import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { Alert } from 'react-native';

import { trFeed } from '@/i18n';
import { createMockServices, ServicesProvider, type Services } from '@/services';

import { PostDetailScreen } from './PostDetailScreen';

const mockGoBack = jest.fn();

jest.mock('react-native-reanimated', () => {
  const mock = jest.requireActual('../../components/illustration/reanimatedTestMock').createReanimatedMock();
  const cancelAnimation = jest.fn();
  return { ...mock, cancelAnimation, default: { ...mock.default, cancelAnimation } };
});
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('@/components/RouteLine', () => ({
  RouteLine: () => null,
}));
jest.mock('./useFeedGoBack', () => ({
  useFeedGoBack: () => mockGoBack,
}));

function renderScreen(services: Services, postId = 'post-001') {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ServicesProvider services={services}>{children}</ServicesProvider>
  );
  return render(<PostDetailScreen postId={postId} now={new Date('2026-10-10T10:00:00+03:00')} />, {
    wrapper,
  });
}

describe('PostDetailScreen', () => {
  it('gönderi detayını ve yorumları listeler', async () => {
    const services = createMockServices();
    try {
      await renderScreen(services, 'post-001');
    } catch (e: any) {
      console.log('CAUGHT ERROR DETAIL:', e.errors?.map((x: any) => x.stack || x.message) || e);
      throw e;
    }

    expect(await screen.findByRole('header', { name: trFeed.detail.title })).toBeTruthy();
    expect(await screen.findByText('Mert')).toBeTruthy();
    expect(await screen.findByText('Harika bir tempo Mert! Sabah sisinde koşmak çok keyifli olmalı.')).toBeTruthy();
  });

  it('yanıtları açıp kapatabilir', async () => {
    const services = createMockServices();
    await renderScreen(services, 'post-001');

    const toggleButton = await screen.findByRole('button', { name: trFeed.detail.showReplies(1) });
    expect(toggleButton).toBeTruthy();

    await fireEvent.press(toggleButton);
    expect(await screen.findByText('Teşekkürler Zeynep, bir sonraki sefere beraber çıkalım!')).toBeTruthy();

    const hideButton = await screen.findByRole('button', { name: trFeed.detail.hideReplies });
    await fireEvent.press(hideButton);
    await waitFor(() => {
      expect(screen.queryByText('Teşekkürler Zeynep, bir sonraki sefere beraber çıkalım!')).toBeNull();
    });
  });

  it('yeni yorum ekler ve listede gösterir', async () => {
    const services = createMockServices();
    await renderScreen(services, 'post-001');

    const input = await screen.findByTestId('comment-input');
    await fireEvent.changeText(input, 'Harika koşu tebrikler!');

    const sendBtn = screen.getByRole('button', { name: trFeed.detail.send });
    await fireEvent.press(sendBtn);

    expect(await screen.findByText('Harika koşu tebrikler!')).toBeTruthy();
    expect(input.props.value).toBe('');
  });

  it('yoruma yanıt verme akışını yönetir', async () => {
    const services = createMockServices();
    await renderScreen(services, 'post-001');

    const replyButtons = await screen.findAllByRole('button', { name: trFeed.detail.reply });
    expect(replyButtons.length).toBeGreaterThan(0);

    await fireEvent.press(replyButtons[0]);
    expect(await screen.findByText(trFeed.detail.replyingTo('Zeynep'))).toBeTruthy();

    const cancelBtn = screen.getByRole('button', { name: trFeed.detail.cancelReply });
    await fireEvent.press(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText(trFeed.detail.replyingTo('Zeynep'))).toBeNull();
    });
  });

  it("başkasının gönderisinde düzenle ve sil butonları görünmez", async () => {
    const services = createMockServices();
    await renderScreen(services, 'post-001');

    expect(await screen.findByText('Mert')).toBeTruthy();
    expect(screen.queryByTestId('edit-post-btn-post-001')).toBeNull();
    expect(screen.queryByTestId('delete-post-btn-post-001')).toBeNull();
  });

  it('kendi gönderisinde düzenle butonu ile açıklamayı günceller', async () => {
    const services = createMockServices();
    await renderScreen(services, 'post-005');

    expect(await screen.findByText('Elif')).toBeTruthy();
    const editBtn = await screen.findByTestId('edit-post-btn-post-005');
    expect(editBtn).toBeTruthy();

    await fireEvent.press(editBtn);

    const input = await screen.findByTestId('post-edit-caption-input');
    expect(input).toBeTruthy();
    await fireEvent.changeText(input, 'Harika bir sabah koşusuydu!');

    const saveBtn = screen.getByTestId('post-edit-save-btn');
    await fireEvent.press(saveBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('post-edit-modal')).toBeNull();
    });
    expect(await screen.findByText('Harika bir sabah koşusuydu!')).toBeTruthy();
  });

  it('kendi gönderisinde sil butonu onaylandıktan sonra gönderiyi siler ve geri döner', async () => {
    const services = createMockServices();
    mockGoBack.mockClear();
    const alertSpy = jest.spyOn(Alert, 'alert');

    await renderScreen(services, 'post-005');

    expect(await screen.findByText('Elif')).toBeTruthy();
    const deleteBtn = await screen.findByTestId('delete-post-btn-post-005');
    expect(deleteBtn).toBeTruthy();

    await fireEvent.press(deleteBtn);

    expect(alertSpy).toHaveBeenCalledWith(
      trFeed.detail.deletePostConfirmTitle,
      trFeed.detail.deletePostConfirmMessage,
      expect.any(Array),
    );

    const buttons = alertSpy.mock.calls[0][2] as any[];
    const okBtn = buttons.find((b) => b.style === 'destructive');
    expect(okBtn).toBeTruthy();

    await okBtn.onPress();

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
    alertSpy.mockRestore();
  });
});

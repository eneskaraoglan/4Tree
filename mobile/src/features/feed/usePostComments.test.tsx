import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { createMockServices, ServicesProvider } from '@/services';

import { usePostComments } from './usePostComments';

jest.mock('react-native-reanimated', () => {
  const mock = jest.requireActual('../../components/illustration/reanimatedTestMock').createReanimatedMock();
  const cancelAnimation = jest.fn();
  return { ...mock, cancelAnimation, default: { ...mock.default, cancelAnimation } };
});
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

const flush = () => act(async () => {});

async function renderCommentsHook(postId = 'post-001') {
  const services = createMockServices();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ServicesProvider services={services}>{children}</ServicesProvider>
  );
  const hook = await renderHook(() => usePostComments(postId), { wrapper });
  await flush();
  return { ...hook, services };
}

describe('usePostComments', () => {
  it('başlangıçta yorumları yükler', async () => {
    const { result } = await renderCommentsHook('post-001');

    expect(result.current.status).toBe('ready');
    expect(result.current.comments.length).toBeGreaterThan(0);
    const first = result.current.comments[0];
    expect(first.author.name).toBe('Zeynep');
    expect(first.replies?.length).toBeGreaterThan(0);
  });

  it('yeni ana yorum ekler', async () => {
    const { result } = await renderCommentsHook('post-001');

    let ok = false;
    await act(async () => {
      ok = await result.current.addComment('Yeni test yorumu!');
    });

    expect(ok).toBe(true);
    const added = result.current.comments.find((c) => c.body === 'Yeni test yorumu!');
    expect(added).toBeTruthy();
    expect(added?.author.name).toBe('Elif');
  });

  it('yoruma yanıt ekler', async () => {
    const { result } = await renderCommentsHook('post-001');

    const parent = result.current.comments[0];
    await act(async () => {
      result.current.setReplyingTo({ commentId: parent.id, authorName: parent.author.name });
    });
    expect(result.current.replyingTo?.commentId).toBe(parent.id);

    let ok = false;
    await act(async () => {
      ok = await result.current.addComment('Zeynep yanıtı');
    });

    expect(ok).toBe(true);
    expect(result.current.replyingTo).toBeNull();
    const updatedParent = result.current.comments.find((c) => c.id === parent.id);
    expect(updatedParent?.replies?.some((r) => r.body === 'Zeynep yanıtı')).toBe(true);
  });

  it('kendi yorumunu siler', async () => {
    const { result } = await renderCommentsHook('post-001');

    // post-001 içinde comment-001-3 Elif'e ait
    const elifComment = result.current.comments.find((c) => c.author.id === 'user-elif');
    expect(elifComment).toBeTruthy();

    await act(async () => {
      await result.current.deleteComment(elifComment!.id);
    });

    expect(result.current.comments.some((c) => c.id === elifComment!.id)).toBe(false);
  });

  it('yoruma tepki verir ve günceller', async () => {
    const { result } = await renderCommentsHook('post-001');

    const comment = result.current.comments[0];
    await act(async () => {
      await result.current.reactComment(comment.id, 'heart');
    });

    const updated = result.current.comments.find((c) => c.id === comment.id);
    expect(updated?.myReaction).toBe('heart');
  });
});

import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { cancelAnimation } from 'react-native-reanimated';

import { getMotionCalls, resetMotionCalls, setReducedMotion } from '@/components/illustration/reanimatedTestMock';

import { ReactionButton } from './ReactionButton';

jest.mock('react-native-reanimated', () => {
  const mock = jest.requireActual('../../components/illustration/reanimatedTestMock').createReanimatedMock();
  const cancelAnimation = jest.fn();
  return { ...mock, cancelAnimation, default: { ...mock.default, cancelAnimation } };
});
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

describe('ReactionButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setReducedMotion(false);
    resetMotionCalls();
  });

  it('durumu ve sayıyı ekran okuyucuya okur', async () => {
    await render(<ReactionButton kind="clap" active count={12} onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Alkışla, 12 kişi alkışladı, seçili', selected: true })).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
  });

  it('sayı sıfırsa sayıyı göstermez ve "henüz kimse" der', async () => {
    await render(<ReactionButton kind="water" active={false} count={0} onPress={jest.fn()} />);
    expect(screen.getByLabelText('Su ver, henüz kimse su vermedi')).toBeTruthy();
    expect(screen.queryByText('0')).toBeNull();
  });

  it('dokunuşta haptic verir, sıçrar ve onPress çağırır', async () => {
    const onPress = jest.fn();
    await render(<ReactionButton kind="clap" active={false} count={1} onPress={onPress} />);
    await fireEvent.press(screen.getByTestId('reaction-clap'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
    expect(getMotionCalls().sequence).toBe(1);
  });

  it('aktif tepkiyi geri alırken ve prop dışarıdan değişirken sıçramaz', async () => {
    const { rerender } = await render(<ReactionButton kind="clap" active={false} count={1} onPress={jest.fn()} />);
    await rerender(<ReactionButton kind="clap" active count={2} onPress={jest.fn()} />);
    expect(getMotionCalls().sequence).toBe(0);
    await fireEvent.press(screen.getByTestId('reaction-clap'));
    expect(getMotionCalls().sequence).toBe(0);
  });

  it('Reduce Motion açıkken sıçramaz', async () => {
    setReducedMotion(true);
    await render(<ReactionButton kind="water" active={false} count={1} onPress={jest.fn()} />);
    await fireEvent.press(screen.getByTestId('reaction-water'));
    expect(getMotionCalls().sequence).toBe(0);
  });

  it('kaldırılırken süren animasyonu iptal eder', async () => {
    const { unmount } = await render(<ReactionButton kind="clap" active={false} count={1} onPress={jest.fn()} />);
    expect(cancelAnimation).not.toHaveBeenCalled();
    await unmount();
    expect(cancelAnimation).toHaveBeenCalledTimes(1);
  });
});

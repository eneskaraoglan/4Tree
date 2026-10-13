import { fireEvent, render, screen } from '@testing-library/react-native';

import { authTr, fill } from '@/i18n';
import { KM_PER_TREE } from '@/services';

import { WelcomeScreen } from './WelcomeScreen';

jest.mock('react-native-reanimated', () =>
  jest.requireActual('@/components/illustration/reanimatedTestMock').createReanimatedMock(),
);
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

describe('WelcomeScreen', () => {
  it('değer cümlesini ve iki butonu gösterir', async () => {
    const onRegister = jest.fn();
    const onLogin = jest.fn();
    await render(<WelcomeScreen onRegister={onRegister} onLogin={onLogin} />);

    expect(screen.getByText(fill(authTr.welcome.tagline, { km: KM_PER_TREE }))).toBeTruthy();
    expect(screen.getByText('Her 20 km, gerçek bir ağaç.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: authTr.welcome.register }));
    await fireEvent.press(screen.getByRole('button', { name: authTr.welcome.login }));
    expect(onRegister).toHaveBeenCalledTimes(1);
    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it('süs sahnesini ekran okuyucudan gizler', async () => {
    await render(<WelcomeScreen onRegister={jest.fn()} onLogin={jest.fn()} />);
    // Gizli öğeler varsayılan sorgulara girmez: sahnedeki ağaçlar erişilebilirlik ağacında yoktur.
    expect(screen.queryByRole('image')).toBeNull();
    expect(screen.queryAllByRole('button')).toHaveLength(2);
  });
});

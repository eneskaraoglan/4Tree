import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { profileTr } from '@/i18n';
import { createMockServices, ServicesProvider } from '@/services';

import { UserProfileScreen } from './UserProfileScreen';

jest.mock('react-native-reanimated', () => {
  const mock = jest.requireActual('@/components/illustration/reanimatedTestMock').createReanimatedMock();
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

jest.mock('@/components/RouteLine', () => ({ RouteLine: () => null }));

function renderScreen(userId: string, onBack = jest.fn()) {
  const services = createMockServices();
  const utils = render(
    <ServicesProvider services={services}>
      <UserProfileScreen userId={userId} onBack={onBack} />
    </ServicesProvider>,
  );
  return { ...utils, services, onBack };
}

describe('UserProfileScreen', () => {
  it('renders public friend profile with name, level, stats and posts', async () => {
    renderScreen('user-mert');

    await waitFor(() => {
      expect(screen.getByTestId('user-profile-name')).toHaveTextContent('Mert');
      expect(screen.getByText(profileTr.levels.tree)).toBeTruthy();
      expect(screen.getByText(profileTr.userProfile.postsTitle)).toBeTruthy();
    });

    expect(screen.getByTestId('friendship-status-btn')).toBeTruthy();
    expect(screen.getByText(profileTr.userProfile.friendship.friends)).toBeTruthy();
  });

  it('renders locked state when profile visibility is private', async () => {
    renderScreen('user-ece');

    await waitFor(() => {
      expect(screen.getByText('Ece')).toBeTruthy();
      expect(screen.getByText(profileTr.userProfile.privateNotice)).toBeTruthy();
    });

    expect(screen.queryByText(profileTr.userProfile.postsTitle)).toBeNull();
  });

  it('renders locked state when profile visibility is friends but user is not friend', async () => {
    renderScreen('user-baris');

    await waitFor(() => {
      expect(screen.getByText('Barış')).toBeTruthy();
      expect(screen.getByText(profileTr.userProfile.friendsOnlyNotice)).toBeTruthy();
    });

    expect(screen.queryByText(profileTr.userProfile.postsTitle)).toBeNull();
  });

  it('sends friend request when pressing add friend button', async () => {
    renderScreen('user-selin');

    await waitFor(() => {
      expect(screen.getByTestId('user-profile-name')).toHaveTextContent('Selin');
      expect(screen.getByText(profileTr.userProfile.friendship.add)).toBeTruthy();
    });

    fireEvent.press(screen.getByText(profileTr.userProfile.friendship.add));

    await waitFor(() => {
      expect(screen.getByText(profileTr.userProfile.friendship.cancelRequest)).toBeTruthy();
    });
  });

  it('accepts incoming friend request', async () => {
    renderScreen('user-ali');

    await waitFor(() => {
      expect(screen.getByTestId('user-profile-name')).toHaveTextContent('Ali');
      expect(screen.getByText(profileTr.userProfile.friendship.accept)).toBeTruthy();
    });

    fireEvent.press(screen.getByText(profileTr.userProfile.friendship.accept));

    await waitFor(() => {
      expect(screen.getByText(profileTr.userProfile.friendship.friends)).toBeTruthy();
    });
  });

  it('prompts confirmation when removing friend', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    renderScreen('user-mert');

    await waitFor(() => {
      expect(screen.getByText(profileTr.userProfile.friendship.friends)).toBeTruthy();
    });

    fireEvent.press(screen.getByText(profileTr.userProfile.friendship.friends));

    expect(alertSpy).toHaveBeenCalledWith(
      profileTr.userProfile.friendship.confirmRemoveTitle,
      expect.stringContaining('Mert'),
      expect.any(Array),
    );
    alertSpy.mockRestore();
  });

  it('calls onBack when back button is pressed', async () => {
    const { onBack } = renderScreen('user-mert');

    await waitFor(() => {
      expect(screen.getByTestId('user-profile-name')).toHaveTextContent('Mert');
    });

    fireEvent.press(screen.getByLabelText('Geri'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

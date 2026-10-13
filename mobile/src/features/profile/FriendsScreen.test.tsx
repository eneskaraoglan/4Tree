import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { profileTr } from '@/i18n';
import { createMockServices, ServicesProvider } from '@/services';

import { FriendsScreen } from './FriendsScreen';

function renderScreen(onBack = jest.fn(), onPressUser = jest.fn()) {
  const services = createMockServices();
  const utils = render(
    <ServicesProvider services={services}>
      <FriendsScreen onBack={onBack} onPressUser={onPressUser} />
    </ServicesProvider>,
  );
  return { ...utils, services, onBack, onPressUser };
}

describe('FriendsScreen', () => {
  it('renders friends list in initial tab', async () => {
    const { onPressUser } = renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Mert')).toBeTruthy();
      expect(screen.getByText('Zeynep')).toBeTruthy();
      expect(screen.getByText('Can')).toBeTruthy();
      expect(screen.getByText('Defne')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Mert'));
    expect(onPressUser).toHaveBeenCalledWith('user-mert');
  });

  it('prompts confirmation when removing a friend', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText('Mert')).toBeTruthy();
    });

    const removeBtns = screen.getAllByRole('button', { name: profileTr.friends.remove });
    fireEvent.press(removeBtns[0]);

    expect(alertSpy).toHaveBeenCalledWith(
      profileTr.friends.confirmRemoveTitle,
      expect.stringContaining('Mert'),
      expect.any(Array),
    );
    alertSpy.mockRestore();
  });

  it('switches to requests tab and accepts incoming request', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText(profileTr.friends.tabs.requests)).toBeTruthy();
    });

    // Rozet sayısı görünür
    expect(screen.getByTestId('incoming-requests-badge')).toBeTruthy();

    fireEvent.press(screen.getByText(profileTr.friends.tabs.requests));

    await waitFor(() => {
      expect(screen.getByText('Ali')).toBeTruthy();
      expect(screen.getByText(profileTr.friends.accept)).toBeTruthy();
    });

    fireEvent.press(screen.getByText(profileTr.friends.accept));

    await waitFor(() => {
      expect(screen.queryByTestId('incoming-req-user-ali')).toBeNull();
    });
  });

  it('switches to search tab and searches for users', async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByText(profileTr.friends.tabs.search)).toBeTruthy();
    });

    fireEvent.press(screen.getByRole('tab', { name: profileTr.friends.tabs.search }));

    const searchInput = await screen.findByTestId('friends-search-input');
    fireEvent.changeText(searchInput, 'Selin');

    await waitFor(() => {
      expect(screen.getByText('Selin')).toBeTruthy();
      expect(screen.getByText(profileTr.friends.add)).toBeTruthy();
    });

    fireEvent.press(screen.getByText(profileTr.friends.add));

    await waitFor(() => {
      expect(screen.getByText(profileTr.friends.cancel)).toBeTruthy();
    });
  });

  it('calls onBack when back button is pressed', async () => {
    const { onBack } = renderScreen();

    await waitFor(() => {
      expect(screen.getByLabelText('Geri')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Geri'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { ZoneRow, CONFIRM_WINDOW_MS } from './ZoneRow';

const zone = { id: 'zone-home', label: 'Ev', lat: 41.1, lng: 29, radiusM: 300 };

describe('ZoneRow', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('ilk dokunuşta adı ve değeri değişir, silmez', async () => {
    const onRemove = jest.fn();
    await render(<ZoneRow zone={zone} disabled={false} onRemove={onRemove} />);

    const button = screen.getByRole('button', { name: 'Sil, Ev' });
    expect(button.props.accessibilityHint).toBeUndefined();
    expect(button.props.accessibilityValue?.text).toBeUndefined();

    await fireEvent.press(button);

    const confirming = screen.getByRole('button', { name: 'Silmek için tekrar dokun, Ev' });
    expect(confirming.props.accessibilityValue.text).toBe('Silmek için tekrar dokun');
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('ikinci dokunuşta onRemove çağrılır', async () => {
    const onRemove = jest.fn();
    await render(<ZoneRow zone={zone} disabled={false} onRemove={onRemove} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Sil, Ev' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Silmek için tekrar dokun, Ev' }));

    expect(onRemove).toHaveBeenCalledWith('zone-home');
  });

  it('4 saniye içinde ikinci dokunuş gelmezse onay durumu sıfırlanır', async () => {
    const onRemove = jest.fn();
    await render(<ZoneRow zone={zone} disabled={false} onRemove={onRemove} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Sil, Ev' }));

    await act(async () => {
      jest.advanceTimersByTime(CONFIRM_WINDOW_MS - 1);
    });
    expect(screen.getByRole('button', { name: 'Silmek için tekrar dokun, Ev' })).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.getByRole('button', { name: 'Sil, Ev' })).toBeTruthy();
    expect(CONFIRM_WINDOW_MS).toBe(4000);

    // Süre dolduktan sonra tek dokunuş yine silmez.
    await fireEvent.press(screen.getByRole('button', { name: 'Sil, Ev' }));
    expect(onRemove).not.toHaveBeenCalled();
  });
});

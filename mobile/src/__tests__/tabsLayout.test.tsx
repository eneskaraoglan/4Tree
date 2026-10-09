import * as Haptics from 'expo-haptics';
import { renderRouter, screen, fireEvent } from 'expo-router/testing-library';

import TabsLayout from '@/app/(tabs)/_layout';
import { tr } from '@/i18n';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

const Stub = () => null;

describe('Tab bar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('beş sekmeyi cümle düzeniyle gösterir ve sekme değişince haptic verir', async () => {
    await renderRouter({
      '(tabs)/_layout': TabsLayout,
      '(tabs)/index': Stub,
      '(tabs)/forest': Stub,
      '(tabs)/achievements': Stub,
      '(tabs)/feed': Stub,
      '(tabs)/profile': Stub,
    });
    for (const label of Object.values(tr.tabs)) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getByTestId('tab-rings', { includeHiddenElements: true })).toBeTruthy();

    // Aktif (Koşu) sekmesine tekrar basınca haptic yok.
    await fireEvent.press(screen.getByText(tr.tabs.run));
    expect(Haptics.impactAsync).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText(tr.tabs.forest));
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });
});

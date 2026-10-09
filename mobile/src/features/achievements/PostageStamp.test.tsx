import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Badge } from '@/types';

import { PostageStamp, stampAccessibilityLabel } from './PostageStamp';

jest.mock('./formatBadgeDate', () => {
  // Cihaz saat diliminden bağımsız: tarihler Türkiye gününe göre gösterilir.
  const actual = jest.requireActual<typeof import('./formatBadgeDate')>('./formatBadgeDate');
  return {
    ...actual,
    formatStampDate: (iso?: string) => actual.formatStampDate(iso, 'Europe/Istanbul'),
    formatLongDate: (iso?: string) => actual.formatLongDate(iso, 'Europe/Istanbul'),
  };
});

const earned: Badge = {
  id: 'early-bird',
  name: 'Erken kuş',
  description: "Sabah 07:00'den önce başlayan bir koşu yap.",
  earned: true,
  earnedAt: '2026-10-09T07:16:00+03:00',
};

const locked: Badge = {
  id: 'tree-hero-10',
  name: '10 ağaç kahramanı',
  description: '10 ağaç dikilmesini sağla.',
  earned: false,
};

describe('PostageStamp', () => {
  it('kazanılan pul: ad, tarih damgası ve "kazanıldı" erişilebilirlik etiketi', async () => {
    await render(<PostageStamp badge={earned} width={150} testID="stamp" />);

    const label = 'Erken kuş, kazanıldı, 9 Ekim 2026';
    expect(screen.getByLabelText(label)).toBeTruthy();
    expect(screen.getByText('Erken kuş')).toBeTruthy();
    expect(screen.getByText('9 Eki')).toBeTruthy();
    expect(screen.getByText('2026')).toBeTruthy();
    expect(screen.queryByText('Kilitli')).toBeNull();
  });

  it('kilitli pul: ad, "Kilitli" ve nasıl kazanılacağı; tarih damgası yok', async () => {
    await render(<PostageStamp badge={locked} width={150} />);

    expect(
      screen.getByLabelText('10 ağaç kahramanı, kilitli, nasıl kazanılır: 10 ağaç dikilmesini sağla.'),
    ).toBeTruthy();
    expect(screen.getByText('Kilitli')).toBeTruthy();
    expect(screen.getByText('10 ağaç dikilmesini sağla.')).toBeTruthy();
    expect(screen.queryByText(/Eki|Ağu|2026/)).toBeNull();
  });

  it('onPress verilirse düğme olur ve dokununca çağrılır; verilmezse düğme değildir', async () => {
    const onPress = jest.fn();
    await render(<PostageStamp badge={earned} width={150} onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: /Erken kuş, kazanıldı/ }));
    expect(onPress).toHaveBeenCalledTimes(1);

    await render(<PostageStamp badge={locked} width={150} />);
    expect(screen.queryByRole('button', { name: /10 ağaç kahramanı/ })).toBeNull();
  });

  it('tarihi olmayan kazanılmış rozet damgasız ve tarihsiz etiketle render olur', async () => {
    const noDate: Badge = { ...earned, earnedAt: undefined };
    expect(stampAccessibilityLabel(noDate)).toBe('Erken kuş, kazanıldı');
    await render(<PostageStamp badge={noDate} width={150} />);

    expect(screen.getByLabelText('Erken kuş, kazanıldı')).toBeTruthy();
    expect(screen.queryByText('2026')).toBeNull();
  });

  it('eşlemesi olmayan rozet id için de çökmeden render olur', async () => {
    await render(<PostageStamp badge={{ ...locked, id: 'bilinmeyen' }} width={140} />);

    expect(screen.getByText('10 ağaç kahramanı')).toBeTruthy();
  });
});

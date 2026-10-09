import { render, screen } from '@testing-library/react-native';
import { PixelRatio, StyleSheet } from 'react-native';

import { colors, fontFamily, typography } from '@/theme';

import { AppText, TabularNumber } from './AppText';

describe('AppText', () => {
  it('varsayılan olarak body stili ve text rengini uygular', async () => {
    await render(<AppText>Günaydın, Elif</AppText>);
    const style = StyleSheet.flatten(screen.getByText('Günaydın, Elif').props.style);
    expect(style.fontFamily).toBe(fontFamily.regular);
    expect(style.fontSize).toBe(typography.body.fontSize);
    expect(style.color).toBe(colors.text);
  });

  it('variant ve color özelliklerini uygular', async () => {
    await render(
      <AppText variant="title1" color="primary">
        Ağacına 7,6 km kaldı
      </AppText>,
    );
    const style = StyleSheet.flatten(screen.getByText('Ağacına 7,6 km kaldı').props.style);
    expect(style.fontFamily).toBe(fontFamily.displayExtraBold);
    expect(style.fontSize).toBe(30);
    expect(style.color).toBe(colors.primary);
  });

  it('Türkçe karakterleri olduğu gibi gösterir, büyük harfe çevirmez', async () => {
    const text = 'şğıİöüçŞĞ';
    await render(<AppText variant="small">{text}</AppText>);
    const node = screen.getByText(text);
    expect(StyleSheet.flatten(node.props.style)).not.toHaveProperty('textTransform');
  });

  it('sayaç varyantlarında yazı büyütmeyi sınırlar', async () => {
    await render(<AppText variant="timer">00:00</AppText>);
    expect(screen.getByText('00:00').props.maxFontSizeMultiplier).toBe(1.2);
  });
});

describe('TabularNumber', () => {
  afterEach(() => jest.restoreAllMocks());

  it('her rakamı sabit genişlikli kutuya koyar', async () => {
    jest.spyOn(PixelRatio, 'getFontScale').mockReturnValue(1);
    await render(<TabularNumber value="12:05" variant="timer" />);
    const digits = screen.getAllByTestId('tabular-digit');
    expect(digits).toHaveLength(4);
    for (const digit of digits) {
      expect(StyleSheet.flatten(digit.props.style).width).toBeCloseTo(76 * 0.6);
    }
  });

  it('ekran okuyucuya tek parça değeri okutur', async () => {
    await render(<TabularNumber value="12,4" variant="bigNumber" />);
    expect(screen.getByLabelText('12,4')).toBeTruthy();
  });

  it.each([
    ['05:32', 4],
    ['12,4', 3],
  ])('"%s" gibi rakam dışı karakterli değerde sadece rakamları kutular, font ölçeği 1.2 ile sınırlanır', async (value, digitCount) => {
    jest.spyOn(PixelRatio, 'getFontScale').mockReturnValue(1.5);
    await render(<TabularNumber value={value} variant="timer" />);
    const digits = screen.getAllByTestId('tabular-digit');
    expect(digits).toHaveLength(digitCount);
    for (const digit of digits) {
      expect(StyleSheet.flatten(digit.props.style).width).toBeCloseTo(76 * 1.2 * 0.6);
    }
    expect(screen.getByLabelText(value)).toBeTruthy();
  });

  it('küçük font ölçeğinde rakam kutusu orantılı kalır', async () => {
    jest.spyOn(PixelRatio, 'getFontScale').mockReturnValue(1.1);
    await render(<TabularNumber value="7" variant="bigNumber" />);
    expect(StyleSheet.flatten(screen.getByTestId('tabular-digit').props.style).width).toBeCloseTo(44 * 1.1 * 0.6);
  });
});

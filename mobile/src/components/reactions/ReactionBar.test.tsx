import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { Dimensions, StyleSheet } from 'react-native';
import { cancelAnimation } from 'react-native-reanimated';

import { getMotionCalls, resetMotionCalls, setReducedMotion } from '@/components/illustration/reanimatedTestMock';
import { colors } from '@/theme';
import type { ReactionCounts, ReactionType } from '@/types';

import { PICKER, REACTION_MOTION } from './layout';
import { fallbackAnchor, pickerFrame } from './pickerGeometry';
import { ReactionBar, type ReactionBarProps } from './ReactionBar';

jest.mock('react-native-reanimated', () => {
  const mock = jest.requireActual('../illustration/reanimatedTestMock').createReanimatedMock();
  const cancelAnimation = jest.fn();
  return { ...mock, cancelAnimation, default: { ...mock.default, cancelAnimation } };
});
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

const button = () => screen.getByTestId('reaction-bar-button');
type Json = { type: string; props: Record<string, unknown>; children?: Json[] | null };
/** Çizilen SVG yolları (host RNSVGPath); renkler işlenmiş ARGB sayısıdır. */
const paths = (): Json[] => {
  const found: Json[] = [];
  const walk = (node: Json | Json[] | null) => {
    if (!node) return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.type === 'RNSVGPath') found.push(node);
    walk(node.children ?? null);
  };
  walk(screen.toJSON() as Json | Json[] | null);
  return found;
};
const argb = (hex: string) => 0xff000000 + parseInt(hex.slice(1), 16);
const paint = (value: unknown) => (value as { payload?: number } | null)?.payload;

async function renderBar(props: Partial<ReactionBarProps> = {}) {
  const onChange = jest.fn();
  const utils = await render(<ReactionBar counts={{}} mine={null} onChange={onChange} {...props} />);
  return { onChange, ...utils };
}

const openPicker = async () => {
  await fireEvent(button(), 'longPress');
  return screen.getByTestId('reaction-picker');
};

describe('ReactionBar: dokun ve geri al', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setReducedMotion(false);
    resetMotionCalls();
  });

  it('tepkim yokken dokunmak Su ver verir, Light haptic ve sıçrama ile', async () => {
    const { onChange } = await renderBar();
    await fireEvent.press(button());
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('water');
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
    expect(getMotionCalls().sequence).toBe(1);
  });

  it('tepkim varken dokunmak geri alır (null), sıçramaz', async () => {
    const { onChange } = await renderBar({ mine: 'heart', counts: { heart: 1 } });
    await fireEvent.press(button());
    expect(onChange).toHaveBeenCalledWith(null);
    expect(getMotionCalls().sequence).toBe(0);
  });

  it('Su ver desteklenmiyorsa ilk desteklenen tür verilir; hiç tür yoksa verilmez', async () => {
    const { onChange } = await renderBar({ supported: ['clap', 'leaf'] });
    await fireEvent.press(button());
    expect(onChange).toHaveBeenCalledWith('clap');

    const empty = await renderBar({ supported: [], testID: 'empty-bar' });
    await fireEvent.press(screen.getByTestId('empty-bar-button'));
    await fireEvent(screen.getByTestId('empty-bar-button'), 'longPress');
    expect(empty.onChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId('reaction-picker')).toBeNull();
  });

  it('düğme tepkisizken su ikonu soluk; tepki varken seçilen türün ikonu, rengi ve etiketi', async () => {
    const { rerender } = await renderBar();
    expect(screen.getByText('Su ver')).toBeTruthy();
    const waterBody = paths()[0];
    expect(paint(waterBody.props.stroke)).toBe(argb(colors.textSecondary));
    expect(paint(waterBody.props.fill)).toBeUndefined();

    await rerender(<ReactionBar counts={{ clap: 3 }} mine="clap" onChange={jest.fn()} />);
    expect(screen.getByText('Alkışla')).toBeTruthy();
    expect(screen.queryByText('Su ver')).toBeNull();
    expect(within(button()).getByTestId('reaction-icon-clap')).toBeTruthy();
    const clapBody = paths()[0];
    expect(paint(clapBody.props.stroke)).toBe(argb(colors.gold));
    expect(paint(clapBody.props.fill)).toBe(argb(colors.gold));
  });

  it('tepki dışarıdan (hata dönüşü, yenileme) değişince sıçramaz', async () => {
    const { rerender } = await renderBar();
    await rerender(<ReactionBar counts={{ water: 1 }} mine="water" onChange={jest.fn()} />);
    await rerender(<ReactionBar counts={{}} mine={null} onChange={jest.fn()} />);
    expect(getMotionCalls().sequence).toBe(0);
  });

  it('Reduce Motion açıkken sıçramaz', async () => {
    setReducedMotion(true);
    await renderBar();
    await fireEvent.press(button());
    expect(getMotionCalls().sequence).toBe(0);
  });

  it('kaldırılırken süren animasyonu iptal eder', async () => {
    const { unmount } = await renderBar();
    expect(cancelAnimation).not.toHaveBeenCalled();
    await unmount();
    expect(cancelAnimation).toHaveBeenCalledTimes(1);
  });

  it('dokunma hedefi en az 44 dp (md ve sm)', async () => {
    await renderBar();
    expect(StyleSheet.flatten(button().props.style).minHeight).toBeGreaterThanOrEqual(44);
    await renderBar({ size: 'sm', testID: 'small' });
    expect(StyleSheet.flatten(screen.getByTestId('small-button').props.style).minHeight).toBeGreaterThanOrEqual(44);
    expect(screen.getByTestId('small-button')).toBeTruthy();
  });
});

describe('ReactionBar: seçici', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setReducedMotion(false);
    resetMotionCalls();
  });

  it('basılı tutmak (uzun basma) seçiciyi açar, Medium haptic verir; dokunma tetiklenmez', async () => {
    const { onChange } = await renderBar();
    expect(screen.queryByTestId('reaction-picker')).toBeNull();
    await openPicker();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('medium');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getAllByRole('menuitem').map((el) => el.props.accessibilityLabel)).toEqual([
      'Su ver',
      'Alkışla',
      'Yaprak',
      'Kalp',
      'Güç',
    ]);
  });

  it('uzun basma süresi ~350 ms', () => {
    expect(REACTION_MOTION.longPressMs).toBe(350);
  });

  it('seçeneğe dokunmak onChange çağırır, seçici kapanır, Selection haptic ve sıçrama olur', async () => {
    const { onChange } = await renderBar();
    await openPicker();
    await fireEvent.press(screen.getByRole('menuitem', { name: 'Kalp' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('heart');
    expect(Haptics.selectionAsync).toHaveBeenCalled();
    expect(getMotionCalls().sequence).toBe(1);
    expect(screen.queryByTestId('reaction-picker')).toBeNull();
  });

  it('desteklenmeyen tepki seçicide yok (yalnız supported gösterilir, sıra korunur)', async () => {
    await renderBar({ supported: ['clap', 'water'] });
    await openPicker();
    expect(screen.getAllByRole('menuitem').map((el) => el.props.accessibilityLabel)).toEqual(['Su ver', 'Alkışla']);
    expect(screen.queryByRole('menuitem', { name: 'Güç' })).toBeNull();
    expect(screen.queryByTestId('reaction-option-heart')).toBeNull();
  });

  it('her seçenek en az 44 dp; seçili olan işaretli', async () => {
    await renderBar({ mine: 'leaf', counts: { leaf: 1 } });
    await openPicker();
    for (const el of screen.getAllByRole('menuitem')) {
      const style = StyleSheet.flatten(el.props.style);
      expect(style.width).toBeGreaterThanOrEqual(44);
      expect(style.height).toBeGreaterThanOrEqual(44);
    }
    expect(screen.getByRole('menuitem', { name: 'Yaprak', selected: true })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Su ver', selected: false })).toBeTruthy();
  });

  it('seçili tepkiyi tekrar seçmek değişiklik yapmaz, yalnız kapatır', async () => {
    const { onChange } = await renderBar({ mine: 'clap', counts: { clap: 2 } });
    await openPicker();
    await fireEvent.press(screen.getByRole('menuitem', { name: 'Alkışla' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId('reaction-picker')).toBeNull();
  });

  it('tepkim varken başka tür seçmek onChange(yeni) çağırır (eskinin yerine geçer)', async () => {
    const { onChange } = await renderBar({ mine: 'clap', counts: { clap: 2 } });
    await openPicker();
    await fireEvent.press(screen.getByRole('menuitem', { name: 'Güç' }));
    expect(onChange).toHaveBeenCalledWith('power');
  });

  it('dışarı dokunma ve geri tuşu seçiciyi değişiklik yapmadan kapatır', async () => {
    const { onChange } = await renderBar();
    await openPicker();
    await fireEvent.press(screen.getByTestId('reaction-picker-backdrop', { includeHiddenElements: true }));
    expect(screen.queryByTestId('reaction-picker')).toBeNull();

    await openPicker();
    await act(async () => {
      screen.getByTestId('reaction-picker-modal').props.onRequestClose();
    });
    expect(screen.queryByTestId('reaction-picker')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('ekran okuyucu "kaçış" hareketi de kapatır; hap menü olarak etiketlidir', async () => {
    await renderBar();
    const picker = await openPicker();
    expect(picker.props.accessibilityLabel).toBe('Tepki seçenekleri');
    expect(picker.props.accessibilityRole).toBe('menu');
    expect(picker.props.accessibilityViewIsModal).toBe(true);
    await act(async () => {
      picker.props.onAccessibilityEscape();
    });
    expect(screen.queryByTestId('reaction-picker')).toBeNull();
  });

  describe('parmak kaydırarak seçim', () => {
    const { width, height } = Dimensions.get('window');
    const frame = (count = 5) => pickerFrame(fallbackAnchor(height), count, width);
    const optionX = (index: number, count = 5) => {
      const f = frame(count);
      return f.left + PICKER.padding + PICKER.borderWidth + index * PICKER.item + PICKER.item / 2;
    };
    const y = () => frame().top + frame().height / 2;
    const touch = (type: 'touchMove' | 'touchEnd', pageX: number, pageY: number) =>
      fireEvent(screen.getByTestId('reaction-bar-touch'), type, { nativeEvent: { pageX, pageY } });

    it('parmak bir seçeneğin üstünde kalkınca o tepki seçilir', async () => {
      const { onChange } = await renderBar();
      await openPicker();
      await touch('touchMove', optionX(3), y());
      expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
      const bg = (name: string) =>
        StyleSheet.flatten(screen.getByRole('menuitem', { name }).props.style).backgroundColor;
      expect(bg('Kalp')).toBe(colors.surface2);
      expect(bg('Su ver')).toBeUndefined();
      await touch('touchEnd', optionX(3), y());
      expect(onChange).toHaveBeenCalledWith('heart');
      expect(screen.queryByTestId('reaction-picker')).toBeNull();
    });

    it('seçenekler arasında kaydırınca son üstünde durulan seçilir', async () => {
      const { onChange } = await renderBar();
      await openPicker();
      await touch('touchMove', optionX(1), y());
      await touch('touchMove', optionX(4), y());
      await touch('touchEnd', optionX(4), y());
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('power');
    });

    it('parmak hapın dışında kalkarsa seçim yapılmaz, hap açık kalır (dokunarak seçilir)', async () => {
      const { onChange } = await renderBar();
      await openPicker();
      await touch('touchMove', optionX(2), y());
      await touch('touchMove', optionX(2), frame().top - 200);
      await touch('touchEnd', optionX(2), frame().top - 200);
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByTestId('reaction-picker')).toBeTruthy();
    });

    it('seçici açık değilken dokunma olayları hiçbir şey yapmaz', async () => {
      const { onChange } = await renderBar();
      await touch('touchMove', optionX(0), y());
      await touch('touchEnd', optionX(0), y());
      expect(onChange).not.toHaveBeenCalled();
      expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    });

    it('yalnız desteklenen sayıda seçenek izlenir', async () => {
      const { onChange } = await renderBar({ supported: ['water', 'clap'] });
      await openPicker();
      // 3. konum (Yaprak) bu hapta yok.
      await touch('touchMove', optionX(2, 2) + PICKER.item, y());
      await touch('touchEnd', optionX(2, 2) + PICKER.item, y());
      expect(onChange).not.toHaveBeenCalled();
    });
  });
});

describe('ReactionBar: özet', () => {
  const summary = () => screen.queryByTestId('reaction-bar-summary');

  it('tepki yoksa (toplam 0) özet hiç görünmez', async () => {
    await renderBar({ counts: { water: 0, clap: 0 } });
    expect(summary()).toBeNull();
    await renderBar({ counts: {}, testID: 'other' });
    expect(screen.queryByTestId('other-summary')).toBeNull();
  });

  it('kullanılan türlerin ikonları üst üste ve toplam sayı tek satırda', async () => {
    await renderBar({ counts: { water: 9, clap: 24 }, mine: null });
    expect(screen.getByText('33')).toBeTruthy();
    // En çok kullanılan önde.
    const icons = screen.getAllByTestId(/^reaction-summary-icon-/).map((el) => el.props.testID);
    expect(icons).toEqual(['reaction-summary-icon-clap', 'reaction-summary-icon-water']);
    expect(summary()!.props.accessibilityLabel).toBe('33 tepki: Su ver 9, Alkışla 24');
  });

  it('en çok 3 ikon gösterilir; sayı tüm türlerin toplamıdır', async () => {
    const counts: ReactionCounts = { water: 1, clap: 5, leaf: 4, heart: 3, power: 2 };
    await renderBar({ counts });
    const icons = screen.getAllByTestId(/^reaction-summary-icon-/).map((el) => el.props.testID);
    expect(icons).toEqual([
      'reaction-summary-icon-clap',
      'reaction-summary-icon-leaf',
      'reaction-summary-icon-heart',
    ]);
    expect(screen.getByText('15')).toBeTruthy();
    expect(summary()!.props.accessibilityLabel).toBe('15 tepki: Su ver 1, Alkışla 5, Yaprak 4, Kalp 3, Güç 2');
  });

  it('sayısı 0 olan tür ikon almaz', async () => {
    await renderBar({ counts: { water: 0, heart: 2 } });
    expect(screen.queryByTestId('reaction-summary-icon-water')).toBeNull();
    expect(screen.getByTestId('reaction-summary-icon-heart')).toBeTruthy();
  });

  it('destekte olmayan türün mevcut sayısı yine özette görünür (sunucu sayıları)', async () => {
    await renderBar({ counts: { leaf: 2 }, supported: ['water', 'clap'] });
    expect(screen.getByTestId('reaction-summary-icon-leaf')).toBeTruthy();
  });
});

describe('ReactionBar: erişilebilirlik', () => {
  beforeEach(() => jest.clearAllMocks());

  it('tepkisizken "Tepki ver", tepkiliyken "Tepkin: ..., geri almak için dokun"', async () => {
    const { rerender } = await renderBar();
    expect(screen.getByRole('button', { name: 'Tepki ver', selected: false })).toBeTruthy();
    expect(button().props.accessibilityHint).toBe('Diğer tepkiler için basılı tut');
    await rerender(<ReactionBar counts={{ water: 1 }} mine="water" onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Tepkin: Su ver, geri almak için dokun', selected: true })).toBeTruthy();
  });

  it('uzun basmaya alternatif: her tepki için özel eylem', async () => {
    await renderBar();
    expect(button().props.accessibilityActions).toEqual([
      { name: 'water', label: 'Su ver' },
      { name: 'clap', label: 'Alkışla' },
      { name: 'leaf', label: 'Yaprak' },
      { name: 'heart', label: 'Kalp' },
      { name: 'power', label: 'Güç' },
    ]);
  });

  it('özel eylem tepkiyi doğrudan seçer', async () => {
    const { onChange } = await renderBar();
    await fireEvent(button(), 'accessibilityAction', { nativeEvent: { actionName: 'leaf' } });
    expect(onChange).toHaveBeenCalledWith('leaf');
  });

  it('seçili tepki varken "Tepkiyi geri al" eylemi çıkar ve null verir; seçili türün eylemi değişiklik yapmaz', async () => {
    const { onChange } = await renderBar({ mine: 'heart', counts: { heart: 1 } });
    const names = button().props.accessibilityActions.map((a: { name: string }) => a.name);
    expect(names).toContain('remove');
    await fireEvent(button(), 'accessibilityAction', { nativeEvent: { actionName: 'heart' } });
    expect(onChange).not.toHaveBeenCalled();
    await fireEvent(button(), 'accessibilityAction', { nativeEvent: { actionName: 'remove' } });
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('eylemler yalnız desteklenen türleri sunar; desteklenmeyen ad yok sayılır', async () => {
    const { onChange } = await renderBar({ supported: ['water', 'clap'] });
    expect(button().props.accessibilityActions.map((a: { name: string }) => a.name)).toEqual(['water', 'clap']);
    await fireEvent(button(), 'accessibilityAction', { nativeEvent: { actionName: 'power' as ReactionType } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('seçici ve özet etiketleri okunur', async () => {
    await renderBar({ counts: { water: 2 } });
    expect(screen.getByLabelText('2 tepki: Su ver 2')).toBeTruthy();
  });
});

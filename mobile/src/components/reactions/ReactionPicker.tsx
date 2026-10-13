import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { trFeed } from '@/i18n';
import { colors, radius } from '@/theme';
import type { ReactionType } from '@/types';

import { PICKER } from './layout';
import type { PickerFrame } from './pickerGeometry';
import { REACTIONS } from './reactions';

type Props = {
  visible: boolean;
  frame: PickerFrame;
  /** Gösterilecek türler, seçici sırasında. */
  options: readonly ReactionType[];
  mine: ReactionType | null;
  /** Parmak kaydırırken üstünde durulan seçenek (sıra). */
  hoveredIndex: number | null;
  onSelect: (reaction: ReactionType) => void;
  onClose: () => void;
};

/**
 * Düğmenin üstünde açılan yatay hap: yüzey rengi ve ince çizgi, gölge yok. Modal içinde durur ki
 * Android'de gönderi sınırlarının dışında da dokunulabilsin; boş alana dokunma, geri tuşu ve ekran okuyucu
 * "kaçış" hareketi kapatır.
 */
export function ReactionPicker({ visible, frame, options, mine, hoveredIndex, onSelect, onClose }: Props) {
  const reduceMotion = useReducedMotion();
  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
      statusBarTranslucent
      testID="reaction-picker-modal">
      <View style={styles.root}>
        {/* Arka plan yalnız dokunarak kapatır; ekran okuyucu için kapatma geri/kaçış hareketidir. */}
        <Pressable
          accessible={false}
          importantForAccessibility="no"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
          testID="reaction-picker-backdrop"
        />
        <View
          accessibilityViewIsModal
          accessibilityRole="menu"
          accessibilityLabel={trFeed.reactions.picker}
          onAccessibilityEscape={onClose}
          style={[styles.pill, { left: frame.left, top: frame.top, width: frame.width, height: frame.height }]}
          testID="reaction-picker">
          {options.map((type, index) => {
            const { Icon, color, label } = REACTIONS[type];
            const hovered = hoveredIndex === index;
            return (
              <Pressable
                key={type}
                accessibilityRole="menuitem"
                accessibilityLabel={label}
                accessibilityState={{ selected: mine === type }}
                onPress={() => onSelect(type)}
                style={[styles.item, (hovered || mine === type) && styles.itemActive]}
                testID={`reaction-option-${type}`}>
                <Icon size={PICKER.iconSize} color={colors[color]} active={hovered || mine === type} />
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pill: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    padding: PICKER.padding,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: PICKER.borderWidth,
    borderColor: colors.divider,
  },
  item: {
    width: PICKER.item,
    height: PICKER.item,
    borderRadius: PICKER.item / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemActive: { backgroundColor: colors.surface2 },
});

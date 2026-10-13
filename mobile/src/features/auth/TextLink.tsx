import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { touch } from '@/theme';

type Props = {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  align?: 'flex-start' | 'center' | 'flex-end';
};

/** Altı çizili metin bağlantısı (şifremi unuttum, hesap oluştur). Dokunma alanı en az 44 dp. */
export function TextLink({ label, onPress, accessibilityLabel, align = 'flex-start' }: Props) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={{ left: 8, right: 8 }}
      onPress={onPress}
      style={({ pressed }) => [styles.link, { alignSelf: align }, pressed && styles.pressed]}>
      <AppText variant="body" color="primary" style={styles.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { minHeight: touch.min, justifyContent: 'center' },
  text: { textDecorationLine: 'underline' },
  pressed: { opacity: 0.7 },
});

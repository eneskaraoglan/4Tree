import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, type TextInput, type TextInputProps } from 'react-native';

import { AppText } from '@/components/AppText';
import { authTr } from '@/i18n/auth';
import { spacing, touch } from '@/theme';

import { TextField } from './TextField';

type Props = Omit<TextInputProps, 'style' | 'accessibilityLabel' | 'secureTextEntry'> & {
  label: string;
  error?: string | null;
  hint?: string;
};

/** Şifre alanı: "Göster/Gizle" metin düğmesi yazarken de erişilebilir; yaprak yeşili, yosun yüzeyde AA. */
export const PasswordField = forwardRef<TextInput, Props>(function PasswordField(props, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      ref={ref}
      autoCapitalize="none"
      autoCorrect={false}
      spellCheck={false}
      {...props}
      secureTextEntry={!visible}
      trailing={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? authTr.fields.hidePasswordLabel : authTr.fields.showPasswordLabel}
          // Basılı/seçili durumu ekran okuyucuya bildirir (şifre şu an görünür).
          accessibilityState={{ selected: visible }}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          onPress={() => setVisible((v) => !v)}
          style={styles.toggle}>
          <AppText variant="secondary" color="primary">
            {visible ? authTr.fields.hidePassword : authTr.fields.showPassword}
          </AppText>
        </Pressable>
      }
    />
  );
});

const styles = StyleSheet.create({
  toggle: { minWidth: touch.min, minHeight: touch.min, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
});

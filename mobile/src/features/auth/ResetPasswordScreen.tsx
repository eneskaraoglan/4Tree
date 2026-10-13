import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { authTr, fill } from '@/i18n';
import { useServices } from '@/services';
import { spacing } from '@/theme';

import { AuthButton } from './AuthButton';
import { AuthScaffold } from './AuthScaffold';
import { FormMessage } from './FormMessage';
import { PasswordField } from './PasswordField';
import { TextLink } from './TextLink';
import { useAuthAction } from './useAuthAction';
import { PASSWORD_MIN_LENGTH, validatePassword, validatePasswordConfirmation, visibleError } from './validation';

type Props = {
  /** Yeni şifre kaydedildi: çağıran, kurtarma modunu bitirip kullanıcıyı uygulamaya alır. */
  onDone: () => void;
  /** Vazgeçildi: geçici oturum kapatılır, giriş ekranına dönülür. */
  onCancel: () => void;
};

/** Şifre sıfırlama bağlantısından dönen kullanıcı için yeni şifre belirleme (iki alan). */
export function ResetPasswordScreen({ onDone, onCancel }: Props) {
  const { auth } = useServices();
  const { pending, error, run } = useAuthAction<'update'>();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [touched, setTouched] = useState({ password: false, confirmation: false });
  const [submitted, setSubmitted] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const confirmationRef = useRef<TextInput>(null);

  const passwordError = visibleError(validatePassword(password, { enforceLength: true }), {
    submitted,
    touched: touched.password,
    value: password,
  });
  const confirmationError = visibleError(validatePasswordConfirmation(password, confirmation), {
    submitted,
    touched: touched.confirmation,
    value: confirmation,
  });

  const submit = async () => {
    setSubmitted(true);
    if (validatePassword(password, { enforceLength: true })) return passwordRef.current?.focus();
    if (validatePasswordConfirmation(password, confirmation)) return confirmationRef.current?.focus();
    const result = await run('update', () => auth.updatePassword(password));
    if (result.ok) onDone();
  };

  return (
    <AuthScaffold title={authTr.resetPassword.title} subtitle={authTr.resetPassword.subtitle}>
      <View style={styles.fields}>
        <PasswordField
          ref={passwordRef}
          label={authTr.resetPassword.newPassword}
          hint={fill(authTr.fields.passwordHint, { min: PASSWORD_MIN_LENGTH })}
          value={password}
          onChangeText={setPassword}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          error={passwordError}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => confirmationRef.current?.focus()}
        />
        <PasswordField
          ref={confirmationRef}
          label={authTr.resetPassword.confirmPassword}
          value={confirmation}
          onChangeText={setConfirmation}
          onBlur={() => setTouched((t) => ({ ...t, confirmation: true }))}
          error={confirmationError}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
        />
      </View>

      <FormMessage error={error} onRetry={pending ? undefined : () => void submit()} />

      <AuthButton
        label={authTr.resetPassword.submit}
        loadingLabel={authTr.resetPassword.submitting}
        loading={pending === 'update'}
        onPress={() => void submit()}
      />
      <View style={styles.footer}>
        <TextLink label={authTr.resetPassword.cancel} onPress={onCancel} align="center" />
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  fields: { rowGap: spacing.lg },
  footer: { alignItems: 'center' },
});

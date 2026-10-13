import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { AppText } from '@/components/AppText';
import { authTr, fill } from '@/i18n';
import { useServices } from '@/services';
import { spacing } from '@/theme';

import { AuthButton } from './AuthButton';
import { AuthScaffold } from './AuthScaffold';
import { ConfirmationNotice } from './ConfirmationNotice';
import { FormMessage } from './FormMessage';
import { GoogleButton } from './GoogleButton';
import { PasswordField } from './PasswordField';
import { TextField } from './TextField';
import { TextLink } from './TextLink';
import { useAuthAction } from './useAuthAction';
import { PASSWORD_MIN_LENGTH, validateEmail, validateName, validatePassword, visibleError } from './validation';

type Props = {
  onBack: () => void;
  onLogin: () => void;
};

/**
 * Ad, e-posta ve şifreyle kayıt (+ Google). Şifre için "tekrar" alanı yok: göster/gizle düğmesi var.
 * Gizlilik/kullanım şartı onay satırı bilinçli yok: aydınlatma metni hazır olunca eklenecek (hukuk notu).
 */
export function RegisterScreen({ onBack, onLogin }: Props) {
  const { auth } = useServices();
  const { pending, error, run } = useAuthAction<'email' | 'google'>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ name: false, email: false, password: false });
  const [submitted, setSubmitted] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const lastAction = useRef<'email' | 'google'>('email');
  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const nameError = visibleError(validateName(name), { submitted, touched: touched.name, value: name });
  const emailError = visibleError(validateEmail(email), { submitted, touched: touched.email, value: email });
  const passwordError = visibleError(validatePassword(password, { enforceLength: true }), {
    submitted,
    touched: touched.password,
    value: password,
  });

  const submit = async () => {
    lastAction.current = 'email';
    setSubmitted(true);
    if (validateName(name)) return nameRef.current?.focus();
    if (validateEmail(email)) return emailRef.current?.focus();
    if (validatePassword(password, { enforceLength: true })) return passwordRef.current?.focus();
    const result = await run('email', () => auth.signUpWithEmail({ name, email, password }));
    if (result.ok && result.value.status === 'confirmationRequired') setConfirmationEmail(email.trim());
  };

  const signUpWithGoogle = () => {
    lastAction.current = 'google';
    void run('google', () => auth.signInWithGoogle());
  };

  const retry = () => (lastAction.current === 'google' ? signUpWithGoogle() : void submit());

  if (confirmationEmail) {
    return (
      <ConfirmationNotice
        title={authTr.register.confirmTitle}
        message={fill(authTr.register.confirmMessage, { email: confirmationEmail })}
        actionLabel={authTr.register.confirmAction}
        onAction={onLogin}
        onBack={onBack}
      />
    );
  }

  return (
    <AuthScaffold title={authTr.register.title} subtitle={authTr.register.subtitle} onBack={onBack}>
      <View style={styles.fields}>
        <TextField
          ref={nameRef}
          label={authTr.fields.name}
          placeholder={authTr.fields.namePlaceholder}
          value={name}
          onChangeText={setName}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          error={nameError}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        <TextField
          ref={emailRef}
          label={authTr.fields.email}
          placeholder={authTr.fields.emailPlaceholder}
          value={email}
          onChangeText={setEmail}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          error={emailError}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <PasswordField
          ref={passwordRef}
          label={authTr.fields.password}
          hint={fill(authTr.fields.passwordHint, { min: PASSWORD_MIN_LENGTH })}
          value={password}
          onChangeText={setPassword}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          error={passwordError}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
        />
      </View>

      <FormMessage error={error} onRetry={pending ? undefined : retry} />

      <View style={styles.actions}>
        <AuthButton
          label={authTr.register.submit}
          loadingLabel={authTr.register.submitting}
          loading={pending === 'email'}
          disabled={pending === 'google'}
          onPress={() => void submit()}
        />
        <AppText variant="secondary" color="textSecondary" style={styles.or}>
          {authTr.login.or}
        </AppText>
        <GoogleButton onPress={signUpWithGoogle} loading={pending === 'google'} disabled={pending === 'email'} />
      </View>

      <View style={styles.footer}>
        <AppText variant="body" color="textSecondary">
          {authTr.register.hasAccount}
        </AppText>
        <TextLink label={authTr.register.toLogin} onPress={onLogin} />
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  fields: { rowGap: spacing.lg },
  actions: { rowGap: spacing.md },
  or: { textAlign: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', columnGap: spacing.sm },
});

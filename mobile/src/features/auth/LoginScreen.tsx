import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { AppText } from '@/components/AppText';
import { authTr } from '@/i18n/auth';
import { useServices } from '@/services';
import { spacing } from '@/theme';

import { AuthButton } from './AuthButton';
import { AuthScaffold } from './AuthScaffold';
import { FormMessage } from './FormMessage';
import { GoogleButton } from './GoogleButton';
import { PasswordField } from './PasswordField';
import { TextField } from './TextField';
import { TextLink } from './TextLink';
import { useAuthAction } from './useAuthAction';
import { validateEmail, validatePassword, visibleError } from './validation';

type Props = {
  onBack: () => void;
  onRegister: () => void;
  onForgotPassword: () => void;
};

/** E-posta + şifre ve Google ile giriş. Başarıda rota koruması kullanıcıyı sekmelere taşır. */
export function LoginScreen({ onBack, onRegister, onForgotPassword }: Props) {
  const { auth } = useServices();
  const { pending, error, run } = useAuthAction<'email' | 'google'>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitted, setSubmitted] = useState(false);
  const lastAction = useRef<'email' | 'google'>('email');
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const emailError = visibleError(validateEmail(email), { submitted, touched: touched.email, value: email });
  const passwordError = visibleError(validatePassword(password, { enforceLength: false }), {
    submitted,
    touched: touched.password,
    value: password,
  });

  const submit = () => {
    lastAction.current = 'email';
    setSubmitted(true);
    if (validateEmail(email)) return emailRef.current?.focus();
    if (validatePassword(password, { enforceLength: false })) return passwordRef.current?.focus();
    void run('email', () => auth.signInWithEmail({ email, password }));
  };

  const signInWithGoogle = () => {
    lastAction.current = 'google';
    // Pencereyi kapatmak hata değildir: servis 'cancelled' döner, ekranda bir şey değişmez.
    void run('google', () => auth.signInWithGoogle());
  };

  const retry = () => (lastAction.current === 'google' ? signInWithGoogle() : submit());

  return (
    <AuthScaffold title={authTr.login.title} subtitle={authTr.login.subtitle} onBack={onBack}>
      <View style={styles.fields}>
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
          textContentType="username"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <View>
          <PasswordField
            ref={passwordRef}
            label={authTr.fields.password}
            value={password}
            onChangeText={setPassword}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            error={passwordError}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          <TextLink label={authTr.login.forgot} onPress={onForgotPassword} align="flex-end" />
        </View>
      </View>

      <FormMessage error={error} onRetry={pending ? undefined : retry} />

      <View style={styles.actions}>
        <AuthButton
          label={authTr.login.submit}
          loadingLabel={authTr.login.submitting}
          loading={pending === 'email'}
          disabled={pending === 'google'}
          onPress={submit}
        />
        <AppText variant="secondary" color="textSecondary" style={styles.or}>
          {authTr.login.or}
        </AppText>
        <GoogleButton onPress={signInWithGoogle} loading={pending === 'google'} disabled={pending === 'email'} />
      </View>

      <View style={styles.footer}>
        <AppText variant="body" color="textSecondary">
          {authTr.login.noAccount}
        </AppText>
        <TextLink label={authTr.login.toRegister} onPress={onRegister} />
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

import { useRef, useState } from 'react';
import { type TextInput } from 'react-native';

import { authTr, fill } from '@/i18n';
import { useServices } from '@/services';

import { AuthButton } from './AuthButton';
import { AuthScaffold } from './AuthScaffold';
import { ConfirmationNotice } from './ConfirmationNotice';
import { FormMessage } from './FormMessage';
import { TextField } from './TextField';
import { useAuthAction } from './useAuthAction';
import { validateEmail, visibleError } from './validation';

type Props = {
  onBack: () => void;
  onBackToLogin: () => void;
};

/** Şifre sıfırlama bağlantısı ister. Başarıda adres kayıtlı olsun olmasın aynı mesaj gösterilir. */
export function ForgotPasswordScreen({ onBack, onBackToLogin }: Props) {
  const { auth } = useServices();
  const { pending, error, run } = useAuthAction<'reset'>();
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const emailRef = useRef<TextInput>(null);

  const emailError = visibleError(validateEmail(email), { submitted, touched, value: email });

  const submit = async () => {
    setSubmitted(true);
    if (validateEmail(email)) return emailRef.current?.focus();
    const result = await run('reset', () => auth.sendPasswordReset(email));
    if (result.ok) setSentTo(email.trim());
  };

  if (sentTo) {
    return (
      <ConfirmationNotice
        title={authTr.forgot.sentTitle}
        message={fill(authTr.forgot.sentMessage, { email: sentTo })}
        actionLabel={authTr.forgot.backToLogin}
        onAction={onBackToLogin}
        onBack={onBack}
      />
    );
  }

  return (
    <AuthScaffold title={authTr.forgot.title} subtitle={authTr.forgot.subtitle} onBack={onBack}>
      <TextField
        ref={emailRef}
        label={authTr.fields.email}
        placeholder={authTr.fields.emailPlaceholder}
        value={email}
        onChangeText={setEmail}
        onBlur={() => setTouched(true)}
        error={emailError}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={() => void submit()}
      />
      <FormMessage error={error} onRetry={pending ? undefined : () => void submit()} />
      <AuthButton
        label={authTr.forgot.submit}
        loadingLabel={authTr.forgot.submitting}
        loading={pending === 'reset'}
        onPress={() => void submit()}
      />
    </AuthScaffold>
  );
}

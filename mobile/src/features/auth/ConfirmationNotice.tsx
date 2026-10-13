import { useEffect, useRef } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AppText } from '@/components/AppText';
import { focusAccessibility } from '@/components/accessibilityFocus';
import { spacing } from '@/theme';

import { AuthButton } from './AuthButton';
import { AuthScaffold } from './AuthScaffold';

type Props = {
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
  onBack?: () => void;
};

/** "E-postanı kontrol et" gibi sonuç durumu: başlığa ekran okuyucu odağı taşınır, mesaj canlı bölgede okunur. */
export function ConfirmationNotice({ title, message, actionLabel, onAction, onBack }: Props) {
  const headingRef = useRef<Text>(null);

  useEffect(() => {
    focusAccessibility(headingRef.current);
  }, []);

  return (
    <AuthScaffold ref={headingRef} title={title} onBack={onBack}>
      <AppText variant="body" color="textSecondary" accessibilityLiveRegion="polite" style={styles.message}>
        {message}
      </AppText>
      <AuthButton variant="primary" label={actionLabel} onPress={onAction} />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  message: { marginTop: -spacing.sm },
});

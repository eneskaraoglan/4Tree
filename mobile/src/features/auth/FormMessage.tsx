import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { authTr } from '@/i18n/auth';
import { spacing } from '@/theme';

import { TextLink } from './TextLink';
import type { ActionError } from './useAuthAction';

type Props = {
  error: ActionError | null;
  /** Verilirse ve hata ağ kaynaklıysa "Tekrar dene" bağlantısı görünür. */
  onRetry?: () => void;
};

/**
 * Form düzeyi hata. Canlı bölge sürekli ekranda durur, metin içine girince ekran okuyucu duyurur.
 * Hata rengi yalnız canvas üzerindedir (danger, surface2 üstünde AA değildir).
 */
export function FormMessage({ error, onRetry }: Props) {
  return (
    <View accessibilityLiveRegion="polite" style={error ? styles.box : undefined}>
      {error ? (
        <>
          <AppText variant="body" color="danger" accessibilityRole="alert">
            {error.message}
          </AppText>
          {error.code === 'network' && onRetry ? <TextLink label={authTr.retry} onPress={onRetry} /> : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { rowGap: spacing.xs },
});

import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { authTr } from '@/i18n/auth';
import { colors, fontFamily } from '@/theme';

import { AuthButton } from './AuthButton';

const MARK_SIZE = 28;

/** Kendi sade "G" işaretimiz: Google'ın marka logosu kopyalanmaz. */
function LetterMark() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.mark}>
      <AppText variant="title3" color="text" style={styles.letter}>
        {authTr.google.letter}
      </AppText>
    </View>
  );
}

type Props = {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function GoogleButton({ onPress, loading, disabled }: Props) {
  return (
    <AuthButton
      variant="secondary"
      label={authTr.google.action}
      loadingLabel={authTr.google.pending}
      leading={<LetterMark />}
      onPress={onPress}
      loading={loading}
      disabled={disabled}
    />
  );
}

const styles = StyleSheet.create({
  mark: {
    width: MARK_SIZE,
    height: MARK_SIZE,
    borderRadius: MARK_SIZE / 2,
    borderWidth: 1.5,
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { fontFamily: fontFamily.displayBold, fontSize: 16, lineHeight: 20 },
});

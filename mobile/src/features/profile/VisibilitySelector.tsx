import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { profileTr } from '@/i18n';
import { spacing } from '@/theme';
import type { Visibility } from '@/types';

import { UnderlinedChoice, type ChoiceOption } from './UnderlinedChoice';

const OPTIONS: readonly ChoiceOption<Visibility>[] = [
  { value: 'public', label: profileTr.privacy.visibility.public },
  { value: 'friends', label: profileTr.privacy.visibility.friends },
  { value: 'private', label: profileTr.privacy.visibility.private },
];

type Props = {
  value: Visibility;
  onChange: (value: Visibility) => void;
  error: string | null;
};

/** "Profilini kim görebilir?" seçimi; altında seçili seçeneğin tek cümlelik açıklaması. */
export function VisibilitySelector({ value, onChange, error }: Props) {
  return (
    <View>
      <AppText variant="title3" accessibilityRole="header">
        {profileTr.privacy.visibilityTitle}
      </AppText>
      <View style={styles.choice}>
        <UnderlinedChoice
          options={OPTIONS}
          selected={value}
          onSelect={onChange}
          accessibilityLabel={profileTr.privacy.visibilityTitle}
        />
      </View>
      <AppText variant="secondary" color="textSecondary" style={styles.hint}>
        {profileTr.privacy.visibilityHint[value]}
      </AppText>
      {error ? (
        <AppText variant="secondary" color="danger" accessibilityRole="alert" style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  choice: { marginTop: spacing.xs },
  hint: { marginTop: spacing.xs },
  error: { marginTop: spacing.sm },
});

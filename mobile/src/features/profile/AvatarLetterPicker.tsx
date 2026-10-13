import type { Ref } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { AppText } from '@/components/AppText';
import { TextField } from '@/features/auth/TextField';
import { TextLink } from '@/features/auth/TextLink';
import { fill, profileTr } from '@/i18n';
import { spacing } from '@/theme';

type Props = {
  /** Adın baş harfi (varsayılan harf). */
  derived: string;
  /** null: varsayılan harf kullanılıyor; metin: elle seçilen harf. */
  custom: string | null;
  error: string | null;
  inputRef: Ref<TextInput>;
  onChange: (text: string) => void;
  onPickOther: () => void;
  onUseName: () => void;
};

/** Avatar harfi: varsayılan adın baş harfi, "Başka harf seç" ile tek karakterlik alan açılır. */
export function AvatarLetterPicker({ derived, custom, error, inputRef, onChange, onPickOther, onUseName }: Props) {
  if (custom === null) {
    return (
      <View style={styles.group}>
        <AppText variant="secondary" color="textSecondary">
          {profileTr.edit.avatarLetter}
        </AppText>
        <AppText variant="body" accessibilityLiveRegion="polite">
          {fill(profileTr.edit.avatarValue, { label: profileTr.edit.avatarFromName, letter: derived })}
        </AppText>
        {error ? (
          <AppText variant="secondary" color="danger" accessibilityRole="alert">
            {error}
          </AppText>
        ) : null}
        <TextLink label={profileTr.edit.pickOther} onPress={onPickOther} />
      </View>
    );
  }

  return (
    <View style={styles.group}>
      <TextField
        ref={inputRef}
        label={profileTr.edit.letterField}
        value={custom}
        error={error}
        onChangeText={onChange}
        autoFocus
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="done"
      />
      <TextLink label={profileTr.edit.useName} onPress={onUseName} />
    </View>
  );
}

const styles = StyleSheet.create({
  group: { rowGap: spacing.xs },
});

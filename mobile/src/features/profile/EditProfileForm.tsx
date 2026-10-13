import { useNavigation } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, type TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { AuthButton } from '@/features/auth/AuthButton';
import { TextField } from '@/features/auth/TextField';
import { profileTr } from '@/i18n';
import { colors, screenPadding, spacing, touch } from '@/theme';
import type { Profile } from '@/types';

import { AvatarLetterPicker } from './AvatarLetterPicker';
import { confirmAction } from './confirmAction';
import { OrganicAvatar } from './OrganicAvatar';
import { useEditProfileForm } from './useEditProfileForm';
import { useGoBack } from './useGoBack';

const PREVIEW_SIZE = 96;

type Props = { profile: Profile };

/**
 * Ad ve avatar harfi formu. Kaydedilmemiş değişiklik varken çıkış (Vazgeç, geri hareketi, Android geri tuşu)
 * onay ister; kaydedince bir önceki ekrana (Profil) dönülür.
 */
export function EditProfileForm({ profile }: Props) {
  const navigation = useNavigation();
  const nameRef = useRef<TextInput>(null);
  const letterRef = useRef<TextInput>(null);
  const inputs = useMemo(() => ({ name: nameRef, letter: letterRef }), []);
  const goBack = useGoBack();
  const form = useEditProfileForm(profile, goBack, inputs);
  const { leaveDecision } = form;

  useEffect(() => {
    return navigation.addListener('beforeRemove', (event) => {
      const decision = leaveDecision();
      if (decision === 'allow') return;
      event.preventDefault();
      // Kayıt sürerken çıkış sessizce engellenir; kayıt bitince ekran zaten tek kez kapanır.
      if (decision === 'block') return;
      confirmAction({
        title: profileTr.edit.discard.title,
        message: profileTr.edit.discard.message,
        confirmLabel: profileTr.edit.discard.confirm,
        cancelLabel: profileTr.edit.discard.cancel,
        onConfirm: () => navigation.dispatch(event.data.action),
      });
    });
  }, [leaveDecision, navigation]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}>
          <Pressable
            accessibilityRole="button"
            onPress={goBack}
            hitSlop={8}
            style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
            <AppText variant="body" color="textSecondary">
              {profileTr.edit.cancel}
            </AppText>
          </Pressable>

          <AppText variant="title1" accessibilityRole="header" style={styles.title}>
            {profileTr.edit.title}
          </AppText>

          <View style={styles.preview}>
            <OrganicAvatar name={form.avatarName} initial={form.initial} size={PREVIEW_SIZE} />
          </View>

          <View style={styles.fields}>
            <TextField
              ref={nameRef}
              label={profileTr.edit.name}
              value={form.name}
              error={form.nameError}
              onChangeText={form.changeName}
              onBlur={form.onNameBlur}
              onSubmitEditing={form.submit}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="done"
            />
            <AvatarLetterPicker
              derived={form.derivedInitial}
              custom={form.customInitial}
              error={form.letterError}
              inputRef={letterRef}
              onChange={form.changeLetter}
              onPickOther={form.pickOtherLetter}
              onUseName={form.useNameLetter}
            />
          </View>

          {/* Canlı bölge hep ekranda; hata metni girince duyurulur. Hata rengi yalnız canvas üzerindedir. */}
          <View accessibilityLiveRegion="polite" style={form.saveError ? styles.saveError : undefined}>
            {form.saveError ? (
              <AppText variant="body" color="danger" accessibilityRole="alert">
                {form.saveError}
              </AppText>
            ) : null}
          </View>

          <View style={styles.save}>
            <AuthButton
              label={profileTr.edit.save}
              loadingLabel={profileTr.edit.saving}
              loading={form.saving}
              disabled={!form.dirty || form.saved}
              onPress={form.submit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: screenPadding, paddingBottom: spacing.xxxl },
  cancel: { minHeight: touch.min, minWidth: touch.min, alignSelf: 'flex-start', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  title: { marginTop: spacing.lg },
  preview: { marginTop: spacing.xxl, alignItems: 'flex-start' },
  fields: { marginTop: spacing.xxl, rowGap: spacing.xxl },
  saveError: { marginTop: spacing.xl },
  save: { marginTop: spacing.xxxl },
});

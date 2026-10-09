import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { fill, profileTr } from '@/i18n';
import { colors, spacing, touch, typography } from '@/theme';

import { UnderlinedChoice, type ChoiceOption } from './UnderlinedChoice';
import type { ZoneDraft } from './usePrivacyActions';
import { DEFAULT_ZONE_RADIUS, MOCK_ZONE_LOCATION, ZONE_LABEL_MAX_LENGTH, ZONE_RADIUS_OPTIONS } from './zoneConfig';

const RADIUS_CHOICES: readonly ChoiceOption<number>[] = ZONE_RADIUS_OPTIONS.map((radius) => ({
  value: radius,
  label: fill(profileTr.privacy.radiusMeters, { radius }),
  accessibilityLabel: fill(profileTr.privacy.zoneRadiusLabel, { label: profileTr.privacy.zoneRadius, radius }),
}));

type Props = {
  busy: boolean;
  onSubmit: (draft: ZoneDraft) => void;
  onCancel: () => void;
};

/** Satır içi bölge formu: ad + yarıçap. Doğrulama PrivacyService'te yapılır, hata üst bileşende gösterilir. */
export function ZoneForm({ busy, onSubmit, onCancel }: Props) {
  const [label, setLabel] = useState('');
  const [radiusM, setRadiusM] = useState<number>(DEFAULT_ZONE_RADIUS);
  const [focused, setFocused] = useState(false);

  const submit = () => {
    if (busy) return;
    onSubmit({ label, radiusM, ...MOCK_ZONE_LOCATION });
  };

  return (
    <View style={styles.form}>
      <TextInput
        accessibilityLabel={profileTr.privacy.zoneName}
        value={label}
        onChangeText={setLabel}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={submit}
        placeholder={profileTr.privacy.zoneNamePlaceholder}
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.primary}
        maxLength={ZONE_LABEL_MAX_LENGTH}
        returnKeyType="done"
        style={[styles.input, { borderBottomColor: focused ? colors.primary : colors.textTertiary }]}
      />
      <View style={styles.radius}>
        <AppText variant="secondary" color="textSecondary">
          {profileTr.privacy.zoneRadius}
        </AppText>
        <UnderlinedChoice
          options={RADIUS_CHOICES}
          selected={radiusM}
          onSelect={setRadiusM}
          accessibilityLabel={profileTr.privacy.zoneRadius}
        />
      </View>
      <AppText variant="small" color="textSecondary">
        {profileTr.privacy.zoneLocation}
      </AppText>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={submit}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <AppText variant="title3" color="primary">
            {profileTr.privacy.zoneSave}
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <AppText variant="body" color="textSecondary">
            {profileTr.privacy.zoneCancel}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md, paddingVertical: spacing.sm },
  input: {
    ...typography.body,
    color: colors.text,
    minHeight: touch.min,
    borderBottomWidth: 1,
    paddingVertical: spacing.sm,
  },
  radius: { gap: spacing.xs },
  actions: { flexDirection: 'row', alignItems: 'center', columnGap: spacing.xxl },
  action: { minHeight: touch.min, minWidth: touch.min, justifyContent: 'center' },
  pressed: { opacity: 0.6 },
});

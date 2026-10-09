import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { profileTr } from '@/i18n';
import { colors, spacing, touch } from '@/theme';
import type { PrivacySettings } from '@/types';

import { usePrivacyActions } from './usePrivacyActions';
import { VisibilitySelector } from './VisibilitySelector';
import { ZoneForm } from './ZoneForm';
import { ZoneRow } from './ZoneRow';

type Props = { initial: PrivacySettings };

/** Gizlilik: görünürlük seçimi ve gizlilik bölgeleri. Satır satır, kartsız. */
export function PrivacySection({ initial }: Props) {
  const { settings, visibilityError, zoneError, zoneBusy, selectVisibility, addZone, removeZone, clearZoneError } =
    usePrivacyActions(initial);
  const [formOpen, setFormOpen] = useState(false);

  const openForm = () => {
    clearZoneError();
    setFormOpen(true);
  };
  const closeForm = () => {
    clearZoneError();
    setFormOpen(false);
  };

  return (
    <View>
      <AppText variant="title2" accessibilityRole="header">
        {profileTr.privacy.title}
      </AppText>

      <View style={styles.block}>
        <VisibilitySelector value={settings.visibility} onChange={(value) => {
            void selectVisibility(value);
          }} error={visibilityError} />
      </View>

      <View style={styles.block}>
        <AppText variant="title3" accessibilityRole="header">
          {profileTr.privacy.zonesTitle}
        </AppText>
        <AppText variant="secondary" color="textSecondary" style={styles.explain}>
          {profileTr.privacy.zonesExplain}
        </AppText>

        {settings.zones.length === 0 ? (
          <AppText variant="body" style={styles.empty}>
            {profileTr.privacy.zonesEmpty}
          </AppText>
        ) : (
          <View style={styles.zones}>
            {settings.zones.map((zone) => (
              <ZoneRow
                key={zone.id}
                zone={zone}
                disabled={zoneBusy}
                onRemove={(id) => {
                  void removeZone(id);
                }}
              />
            ))}
          </View>
        )}

        {formOpen ? (
          <ZoneForm
            busy={zoneBusy}
            onCancel={closeForm}
            onSubmit={async (draft) => {
              if (await addZone(draft)) setFormOpen(false);
            }}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={profileTr.privacy.addZone}
            onPress={openForm}
            style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
            <MaterialCommunityIcons name="plus" size={20} color={colors.textSecondary} />
            <AppText variant="body">
              {profileTr.privacy.addZone}
            </AppText>
          </Pressable>
        )}

        {zoneError ? (
          <AppText variant="secondary" color="danger" accessibilityRole="alert" style={styles.error}>
            {zoneError}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.xxl },
  explain: { marginTop: spacing.xs },
  empty: { marginTop: spacing.lg },
  zones: { marginTop: spacing.sm },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: spacing.sm,
    minHeight: touch.min,
    marginTop: spacing.sm,
  },
  error: { marginTop: spacing.xs },
  pressed: { opacity: 0.6 },
});

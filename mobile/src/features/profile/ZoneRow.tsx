import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { fill, profileTr } from '@/i18n';
import { spacing, touch } from '@/theme';
import type { PrivacyZone } from '@/types';

/** Silme onayı için ikinci dokunuşun bekleme süresi (ms). */
export const CONFIRM_WINDOW_MS = 4000;

type Props = {
  zone: PrivacyZone;
  disabled: boolean;
  onRemove: (zoneId: string) => void;
};

/** Kartsız bölge satırı: etiket, yarıçap ve iki dokunuşla silme. */
export function ZoneRow({ zone, disabled, onRemove }: Props) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), CONFIRM_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [confirming]);

  const handlePress = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    onRemove(zone.id);
  };

  const radius = fill(profileTr.privacy.radiusMeters, { radius: zone.radiusM });
  return (
    <View style={styles.row}>
      <View
        accessible
        accessibilityLabel={fill(profileTr.privacy.zoneRadiusLabel, { label: zone.label, radius: zone.radiusM })}
        style={styles.info}>
        <AppText variant="body">{zone.label}</AppText>
        <AppText variant="secondary" color="textSecondary">
          {radius}
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={fill(
          confirming ? profileTr.privacy.zoneRemoveConfirmLabel : profileTr.privacy.zoneRemoveLabel,
          { label: zone.label },
        )}
        accessibilityValue={confirming ? { text: profileTr.privacy.zoneRemoveConfirm } : undefined}
        disabled={disabled}
        onPress={handlePress}
        style={({ pressed }) => [styles.remove, pressed && styles.pressed]}>
        <AppText variant="secondary" color={confirming ? 'danger' : 'textSecondary'} style={styles.removeText}>
          {confirming ? profileTr.privacy.zoneRemoveConfirm : profileTr.privacy.zoneRemove}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: touch.min },
  info: { flexShrink: 1, paddingVertical: spacing.xs },
  remove: { minHeight: touch.min, minWidth: touch.min, justifyContent: 'center', alignItems: 'flex-end', paddingLeft: spacing.lg },
  removeText: { textAlign: 'right' },
  pressed: { opacity: 0.6 },
});

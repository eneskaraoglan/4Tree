import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { trRun } from '@/i18n';
import { spacing, touch } from '@/theme';

import type { PendingStatus } from './usePendingUploads';

type Props = {
  /** Bağlantı gelince gönderilecekler. */
  count: number;
  /** Birkaç denemeden sonra da gönderilemeyenler. */
  stuckCount: number;
  status: PendingStatus;
  onSendNow: () => void;
  onRetryStuck: () => void;
  onRemoveStuck: () => void;
};

/**
 * "Bağlantı gelince gönderilecek": kaydedilip gönderilemeyen aktiviteler ve elle gönderme.
 * Tekrar tekrar gönderilemeyenler ayrı gösterilir: yeniden dene ya da sil. Kartsız satırlar.
 */
export function PendingUploads({ count, stuckCount, status, onSendNow, onRetryStuck, onRemoveStuck }: Props) {
  if (count <= 0 && stuckCount <= 0) return null;
  const sending = status === 'sending';
  return (
    <View style={styles.root}>
      {count > 0 ? (
        <View style={styles.row}>
          <View style={styles.text}>
            <AppText variant="secondary" color="textSecondary">
              {count === 1 ? trRun.pending.one : trRun.pending.many(count)}
            </AppText>
            {status === 'failed' ? (
              <AppText variant="secondary" color="danger" accessibilityLiveRegion="polite">
                {trRun.pending.failed}
              </AppText>
            ) : null}
          </View>
          <TextButton
            label={sending ? trRun.pending.sending : trRun.pending.sendNow}
            disabled={sending}
            onPress={onSendNow}
          />
        </View>
      ) : null}
      {stuckCount > 0 ? (
        <View style={styles.row}>
          <AppText variant="secondary" color="danger" style={styles.text}>
            {stuckCount === 1 ? trRun.pending.stuckOne : trRun.pending.stuckMany(stuckCount)}
          </AppText>
          <TextButton label={trRun.pending.retry} disabled={sending} onPress={onRetryStuck} />
          <TextButton label={trRun.pending.remove} tone="danger" onPress={onRemoveStuck} />
        </View>
      ) : null}
    </View>
  );
}

function TextButton({
  label,
  onPress,
  disabled,
  tone = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'danger';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <AppText variant="title3" color={tone}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', columnGap: spacing.lg },
  text: { flex: 1, gap: spacing.xs },
  button: { minHeight: touch.min, justifyContent: 'center' },
  pressed: { opacity: 0.6 },
});

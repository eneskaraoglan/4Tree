import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppText } from '@/components/AppText';
import { trFeed } from '@/i18n';
import { colors, radius, spacing, touch } from '@/theme';

type Props = {
  visible: boolean;
  initialCaption: string;
  onSave: (caption: string) => Promise<void> | void;
  onClose: () => void;
};

function PostEditModalContent({
  initialCaption,
  onSave,
  onClose,
}: {
  initialCaption: string;
  onSave: (caption: string) => Promise<void> | void;
  onClose: () => void;
}) {
  const [caption, setCaption] = useState(initialCaption);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(caption.trim());
      onClose();
    } catch {
      setError(trFeed.detail.editPostError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.backdrop}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable
        style={styles.dismissArea}
        onPress={saving ? undefined : onClose}
        testID="post-edit-backdrop"
      />

      <View style={styles.card} testID="post-edit-card">
        <View style={styles.header}>
          <AppText variant="title3">{trFeed.detail.editPostTitle}</AppText>
        </View>

        <TextInput
          testID="post-edit-caption-input"
          value={caption}
          onChangeText={setCaption}
          placeholder={trFeed.detail.editPostPlaceholder}
          placeholderTextColor={colors.textTertiary}
          style={styles.textInput}
          multiline
          maxLength={500}
          editable={!saving}
        />

        {error ? (
          <AppText variant="small" color="danger" style={styles.errorText} testID="post-edit-error">
            {error}
          </AppText>
        ) : null}

        <View style={styles.buttonRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={trFeed.detail.cancel}
            onPress={onClose}
            disabled={saving}
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
            testID="post-edit-cancel-btn">
            <AppText variant="title3" color="textSecondary">
              {trFeed.detail.cancel}
            </AppText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={trFeed.detail.save}
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveBtn,
              saving && styles.saveBtnDisabled,
              pressed && styles.pressed,
            ]}
            testID="post-edit-save-btn">
            {saving ? (
              <ActivityIndicator color={colors.onPrimary} size="small" />
            ) : (
              <AppText variant="title3" color="onPrimary">
                {trFeed.detail.save}
              </AppText>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export function PostEditModal({ visible, initialCaption, onSave, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID="post-edit-modal">
      {visible ? (
        <PostEditModalContent
          initialCaption={initialCaption}
          onSave={onSave}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  dismissArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.lg,
    gap: spacing.md,
    zIndex: 1,
  },
  header: {
    paddingBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.surface2,
    color: colors.text,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 100,
    maxHeight: 180,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  errorText: {
    marginTop: -spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  cancelBtn: {
    minHeight: touch.min,
    minWidth: touch.min,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    minHeight: touch.min,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.7,
  },
});

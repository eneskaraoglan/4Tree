import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppText } from '@/components/AppText';
import { RouteLine } from '@/components/RouteLine';
import { Screen } from '@/components/Screen';
import { trFeed } from '@/i18n';
import { useServices } from '@/services';
import { colors, radius, screenPadding, spacing, touch } from '@/theme';
import type { Activity } from '@/types';

import { formatDuration, formatKm } from './format';

const QUICK_LOCATIONS = ['Belgrad Ormanı', 'Caddebostan Sahil', 'Kaz Dağları', 'Bolu'];

type Props = {
  initialRunId?: string;
  onPostCreated?: () => void;
};

export function PostComposerScreen({ initialRunId, onPostCreated }: Props) {
  const router = useRouter();
  const { feed: feedService, activity: activityService } = useServices();
  const { width } = useWindowDimensions();
  const routeWidth = Math.max(0, width - 2 * screenPadding - 2 * spacing.md);

  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [hasPhoto, setHasPhoto] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [activityPickerVisible, setActivityPickerVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Aktiviteleri ve varsa başlangıç koşusunu yükle
  useEffect(() => {
    let cancelled = false;
    activityService
      .getActivities()
      .then((list) => {
        if (cancelled) return;
        setActivities(list);
        setLoadingActivities(false);
        if (initialRunId) {
          const match = list.find((a) => a.id === initialRunId);
          if (match) {
            setSelectedActivity(match);
            if (match.place && !location) {
              setLocation(match.place);
            }
          }
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingActivities(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activityService, initialRunId, location]);

  const handleSelectActivity = (act: Activity) => {
    setSelectedActivity(act);
    if (act.place && !location) {
      setLocation(act.place);
    }
    setActivityPickerVisible(false);
  };

  const handleRemoveActivity = () => {
    setSelectedActivity(null);
  };

  const canShare = Boolean(caption.trim() || selectedActivity || location.trim() || hasPhoto);

  const handleShare = useCallback(async () => {
    if (!canShare || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      await feedService.createPost({
        caption: caption.trim() || undefined,
        runId: selectedActivity?.id,
        distanceKm: selectedActivity?.distanceKm,
        durationSec: selectedActivity?.durationSec,
        activityType: selectedActivity?.type,
        place: location.trim() || selectedActivity?.place || undefined,
        route: selectedActivity?.route,
      });
      onPostCreated?.();
      router.back();
    } catch {
      setError(trFeed.composer.errorShareFailed);
    } finally {
      setSubmitting(false);
    }
  }, [
    canShare,
    submitting,
    caption,
    selectedActivity,
    location,
    feedService,
    onPostCreated,
    router,
  ]);

  const handleCancel = () => {
    router.back();
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        testID="post-composer-screen"
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Üst Gezinme Çubuğu */}
        <View style={styles.navBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={trFeed.composer.cancel}
            onPress={handleCancel}
            disabled={submitting}
            hitSlop={8}
            style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
            testID="composer-cancel-btn">
            <AppText variant="body" color="textSecondary">
              {trFeed.composer.cancel}
            </AppText>
          </Pressable>

          <AppText variant="title2" accessibilityRole="header">
            {trFeed.composer.title}
          </AppText>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={trFeed.composer.share}
            onPress={handleShare}
            disabled={!canShare || submitting}
            style={({ pressed }) => [
              styles.shareBtn,
              (!canShare || submitting) && styles.shareBtnDisabled,
              pressed && styles.pressed,
            ]}
            testID="composer-share-btn">
            {submitting ? (
              <ActivityIndicator color={colors.onPrimary} size="small" />
            ) : (
              <AppText variant="title3" color={canShare ? 'onPrimary' : 'textTertiary'}>
                {trFeed.composer.share}
              </AppText>
            )}
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Hata Bildirimi */}
          {error ? (
            <View style={styles.errorBox} testID="composer-error-box">
              <AppText variant="secondary" color="danger">
                {error}
              </AppText>
            </View>
          ) : null}

          {/* Açıklama / Metin Girişi */}
          <View style={styles.captionContainer}>
            <TextInput
              testID="composer-caption-input"
              value={caption}
              onChangeText={setCaption}
              placeholder={trFeed.composer.captionPlaceholder}
              placeholderTextColor={colors.textTertiary}
              style={styles.captionInput}
              multiline
              maxLength={500}
              editable={!submitting}
            />
            <AppText variant="small" color="textTertiary" style={styles.charCounter}>
              {caption.length} / 500
            </AppText>
          </View>

          {/* Bağlı Koşu Kartı veya Koşu Ekle Butonu */}
          {selectedActivity ? (
            <View style={styles.attachedCard} testID="composer-attached-run">
              <View style={styles.attachedHeader}>
                <View style={styles.attachedMeta}>
                  <AppText variant="title3">
                    {selectedActivity.type === 'walk' ? trFeed.activity.walk : trFeed.activity.run}
                  </AppText>
                  <AppText variant="secondary" color="textSecondary">
                    {formatKm(selectedActivity.distanceKm)} km ·{' '}
                    {formatDuration(selectedActivity.durationSec)}
                    {selectedActivity.place ? ` · ${selectedActivity.place}` : ''}
                  </AppText>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={trFeed.composer.removeAttachment}
                  onPress={handleRemoveActivity}
                  hitSlop={8}
                  style={styles.removeBtn}
                  testID="composer-remove-run-btn">
                  <AppText variant="small" color="danger">
                    {trFeed.composer.removeAttachment}
                  </AppText>
                </Pressable>
              </View>

              {selectedActivity.route && selectedActivity.route.length >= 2 ? (
                <View style={styles.routeBox}>
                  <RouteLine
                    points={selectedActivity.route}
                    width={routeWidth}
                    height={80}
                    color={colors.primary}
                    accessibilityLabel={trFeed.routeA11y(formatKm(selectedActivity.distanceKm))}
                  />
                </View>
              ) : null}

              <AppText variant="small" color="textTertiary" style={styles.privacyNotice}>
                {trFeed.composer.privacyNotice}
              </AppText>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={trFeed.composer.attachRun}
              onPress={() => setActivityPickerVisible(true)}
              style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
              testID="composer-attach-run-btn">
              <AppText variant="title3" color="primary">
                + {trFeed.composer.attachRun}
              </AppText>
              <AppText variant="small" color="textTertiary">
                {activities.length > 0
                  ? `${activities.length} kayıtlı koşu mevcut`
                  : trFeed.composer.noRunsFound}
              </AppText>
            </Pressable>
          )}

          {/* Konum / Yer Etiketi */}
          <View style={styles.locationSection}>
            <TextInput
              testID="composer-location-input"
              value={location}
              onChangeText={setLocation}
              placeholder={trFeed.composer.locationPlaceholder}
              placeholderTextColor={colors.textTertiary}
              style={styles.locationInput}
              maxLength={80}
              editable={!submitting}
            />

            <View style={styles.chipsRow}>
              {QUICK_LOCATIONS.map((loc) => (
                <Pressable
                  key={loc}
                  accessibilityRole="button"
                  accessibilityLabel={loc}
                  onPress={() => setLocation(loc)}
                  style={({ pressed }) => [
                    styles.chip,
                    location === loc && styles.chipActive,
                    pressed && styles.pressed,
                  ]}>
                  <AppText
                    variant="small"
                    color={location === loc ? 'primary' : 'textSecondary'}>
                    {loc}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Fotoğraf Ekleme Bölümü */}
          {hasPhoto ? (
            <View style={styles.attachedCard} testID="composer-attached-photo">
              <View style={styles.attachedHeader}>
                <AppText variant="title3">{trFeed.composer.photoAttached}</AppText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={trFeed.composer.removeAttachment}
                  onPress={() => setHasPhoto(false)}
                  hitSlop={8}
                  style={styles.removeBtn}
                  testID="composer-remove-photo-btn">
                  <AppText variant="small" color="danger">
                    {trFeed.composer.removeAttachment}
                  </AppText>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={trFeed.composer.attachPhoto}
              onPress={() => setHasPhoto(true)}
              style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
              testID="composer-attach-photo-btn">
              <AppText variant="title3" color="primary">
                + {trFeed.composer.attachPhoto}
              </AppText>
            </Pressable>
          )}
        </ScrollView>

        {/* Koşu Seçim Modalı */}
        <Modal
          visible={activityPickerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setActivityPickerVisible(false)}
          testID="composer-run-picker-modal">
          <View style={styles.pickerBackdrop}>
            <Pressable
              style={styles.pickerDismiss}
              onPress={() => setActivityPickerVisible(false)}
            />
            <View style={styles.pickerCard}>
              <View style={styles.pickerHeader}>
                <AppText variant="title2">{trFeed.composer.selectRunTitle}</AppText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={trFeed.composer.cancel}
                  onPress={() => setActivityPickerVisible(false)}
                  style={styles.navBtn}>
                  <AppText variant="title3" color="primary">
                    {trFeed.composer.cancel}
                  </AppText>
                </Pressable>
              </View>

              <ScrollView style={styles.pickerScroll}>
                {loadingActivities ? (
                  <View style={styles.pickerEmpty}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : activities.length === 0 ? (
                  <View style={styles.pickerEmpty}>
                    <AppText variant="body" color="textSecondary">
                      {trFeed.composer.noRunsFound}
                    </AppText>
                  </View>
                ) : (
                  activities.map((act) => (
                    <Pressable
                      key={act.id}
                      accessibilityRole="button"
                      onPress={() => handleSelectActivity(act)}
                      style={({ pressed }) => [styles.pickerItem, pressed && styles.pressed]}
                      testID={`composer-pick-run-${act.id}`}>
                      <View style={styles.pickerItemMeta}>
                        <AppText variant="title3">
                          {act.type === 'walk' ? trFeed.activity.walk : trFeed.activity.run} ·{' '}
                          {formatKm(act.distanceKm)} km
                        </AppText>
                        <AppText variant="small" color="textSecondary">
                          {formatDuration(act.durationSec)}
                          {act.place ? ` · ${act.place}` : ''}
                        </AppText>
                      </View>
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    minHeight: touch.min,
  },
  navBtn: {
    minHeight: touch.min,
    minWidth: touch.min,
    justifyContent: 'center',
  },
  shareBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnDisabled: {
    backgroundColor: colors.surface2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.huge,
    gap: spacing.lg,
  },
  errorBox: {
    backgroundColor: colors.surface,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  captionContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.md,
    gap: spacing.xs,
  },
  captionInput: {
    color: colors.text,
    fontSize: 16,
    minHeight: 110,
    textAlignVertical: 'top',
  },
  charCounter: {
    alignSelf: 'flex-end',
  },
  attachedCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.md,
    gap: spacing.sm,
  },
  attachedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attachedMeta: {
    flex: 1,
    gap: spacing.xs,
  },
  removeBtn: {
    minHeight: touch.min,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  routeBox: {
    height: 80,
    backgroundColor: colors.surface2,
    borderRadius: radius.card,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  privacyNotice: {
    marginTop: spacing.xs,
  },
  actionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.divider,
    borderStyle: 'dashed',
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  locationSection: {
    gap: spacing.sm,
  },
  locationInput: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    minHeight: 46,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    backgroundColor: colors.surface2,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    borderColor: colors.primary,
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  pickerDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  pickerCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    maxHeight: '75%',
    padding: spacing.lg,
    gap: spacing.md,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerScroll: {
    maxHeight: 380,
  },
  pickerEmpty: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  pickerItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  pickerItemMeta: {
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
});

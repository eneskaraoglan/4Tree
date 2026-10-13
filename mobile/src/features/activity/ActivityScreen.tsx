import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { trActivity } from '@/i18n';
import { spacing, touch } from '@/theme';

import { ActiveActivityView } from './ActiveActivityView';
import { useActivityEnvironment } from './ActivityEnvironment';
import { ActivitySummary } from './ActivitySummary';
import { LocationDeniedView } from './LocationDeniedView';
import { useActivityTracker } from './useActivityTracker';
import { useActivityUserId } from './useActivityUserId';
import { useBaselineKm } from './useBaselineKm';

export type ActivityMode = 'new' | 'resume' | 'finish';

type Props = {
  /**
   * new: yeni aktivite başlar. resume: yarım kalan taslak duraklatılmış açılır.
   * finish: taslak doğrudan bitiş özetine açılır (kaydet/sil).
   */
  mode?: ActivityMode;
};

/** /activity rotasının içeriği: aktif ekran -> bitiş özeti, tek rotada. */
export function ActivityScreen({ mode = 'new' }: Props) {
  const router = useRouter();
  const { locationSource, drafts } = useActivityEnvironment();
  const baselineKm = useBaselineKm();
  const userId = useActivityUserId();
  const userIdRef = useRef(userId);
  const [draftMissing, setDraftMissing] = useState(false);
  const tracker = useActivityTracker({
    source: locationSource,
    persist: (snapshot) => {
      // Kullanıcı henüz okunmadıysa yazılmaz (sonraki periyotta yazılır); taslak hep sahibiyle damgalanır.
      if (userIdRef.current === undefined) return;
      drafts.save(snapshot, userIdRef.current).catch(() => {});
    },
  });
  const { start, restore, finish, status, error } = tracker;
  const finishAfterRestore = useRef(mode === 'finish');

  useEffect(() => {
    userIdRef.current = userId;
  });

  // Yeni aktivite: start idempotenttir (çift effect/Strict Mode güvenli).
  useEffect(() => {
    if (mode === 'new') void start();
  }, [mode, start]);

  // Taslaktan açılış: kullanıcı kimliği okununca yüklenir. Strict Mode'un çift effect'inde ilk yükleme iptal olur,
  // ikincisi uygulanır; bu yüzden "bir kez" bayrağı yoktur.
  useEffect(() => {
    if (mode === 'new' || userId === undefined) return;
    let cancelled = false;
    drafts
      .load(userId)
      .then((snapshot) => {
        if (cancelled) return;
        if (snapshot) restore(snapshot);
        else setDraftMissing(true);
      })
      .catch(() => {
        if (!cancelled) setDraftMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, userId, drafts, restore]);

  // "Kaydet" ile açıldıysa taslak yüklenince hemen bitiş özetine geç.
  useEffect(() => {
    if (finishAfterRestore.current && status === 'paused') {
      finishAfterRestore.current = false;
      finish();
    }
  }, [status, finish]);

  // Kayıt sürerken ya da özet açıkken geri tuşu aktiviteyi yanlışlıkla kapatmasın.
  const guarded = status === 'running' || status === 'paused' || status === 'finished';
  useEffect(() => {
    if (!guarded) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [guarded]);

  // Yığını temizleyerek ana ekrana dön: geri tuşu bitmiş aktiviteye götürmesin.
  const leave = () => router.dismissTo('/');

  if (status === 'finished' && tracker.result) {
    if (userId === undefined) return <Screen>{null}</Screen>;
    return <ActivitySummary result={tracker.result} baselineKm={baselineKm} userId={userId} onDone={leave} />;
  }
  if (error === 'permission' && status === 'idle') return <LocationDeniedView onBack={leave} />;
  if (draftMissing) {
    return (
      <Screen>
        <View style={styles.missing}>
          <AppText variant="body" color="textSecondary">
            {trActivity.restore.missing}
          </AppText>
          <Pressable accessibilityRole="button" onPress={leave} style={styles.back}>
            <AppText variant="title3" color="primary">
              {trActivity.permission.back}
            </AppText>
          </Pressable>
        </View>
      </Screen>
    );
  }
  if (status === 'idle') return <Screen>{null}</Screen>;
  return <ActiveActivityView tracker={tracker} baselineKm={baselineKm} />;
}

const styles = StyleSheet.create({
  missing: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  back: { minHeight: touch.min, justifyContent: 'center' },
});

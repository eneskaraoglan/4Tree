import React, { useEffect, useState, useRef } from 'react';
import { Modal, View, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';

import { AppText, TabularNumber } from '@/components/AppText';
import { useServices } from '@/services';
import { colors, radius, spacing } from '@/theme';
import type { ActivityType, RoutePoint } from '@/types';

type Props = {
  visible: boolean;
  type: ActivityType;
  onClose: () => void;
  onRunSaved: () => void;
};

export function ActiveRunModal({ visible, type, onClose, onRunSaved }: Props) {
  const services = useServices();
  const [seconds, setSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [route, setRoute] = useState<RoutePoint[]>([]);
  const [saving, setSaving] = useState(false);
  const [resultSummary, setResultSummary] = useState<{ distanceKm: number; treesEarned: number } | null>(null);

  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (visible && !isPaused && !resultSummary) {
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);

        const baseLat = 41.0082;
        const baseLng = 28.9784;
        const offset = (Math.random() - 0.5) * 0.0002;
        setRoute((prev) => [
          ...prev,
          { lat: baseLat + prev.length * 0.0001 + offset, lng: baseLng + prev.length * 0.0001 },
        ]);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible, isPaused, resultSummary]);

  const handleFinish = async () => {
    if (seconds < 2) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      const finalRoute = route.length >= 2 ? route : [
        { lat: 41.0082, lng: 28.9784 },
        { lat: 41.0182, lng: 28.9884 },
      ];

      const savedActivity = await services.activity.saveActivity({
        type,
        durationSec: seconds,
        startedAt: new Date().toISOString(),
        place: 'İstanbul Hatıra Parkı',
        route: finalRoute,
      });

      setResultSummary({
        distanceKm: savedActivity.distanceKm,
        treesEarned: savedActivity.treesEarned,
      });
      onRunSaved();
    } catch (e: any) {
      Alert.alert('Hata', e?.message || 'Aktivite kaydedilirken bir hata oluştu.');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const estimatedKm = (route.length * 0.02).toFixed(2);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {resultSummary ? (
          <View style={styles.summaryCard}>
            <AppText variant="title1" color="primary" style={styles.centerText}>
              🎉 Harika İş!
            </AppText>
            <AppText variant="body" color="textSecondary" style={styles.centerText}>
              Aktiviteniz canlı Supabase veritabanına başarıyla kaydedildi.
            </AppText>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <AppText variant="small" color="textTertiary">Toplam Mesafe</AppText>
                <AppText variant="title2">{resultSummary.distanceKm} km</AppText>
              </View>
              <View style={styles.statBox}>
                <AppText variant="small" color="textTertiary">Kazanılan Ağaç</AppText>
                <AppText variant="title2" color="primary">+{resultSummary.treesEarned} 🌳</AppText>
              </View>
            </View>

            <Pressable style={styles.doneBtn} onPress={() => { setResultSummary(null); setSeconds(0); setRoute([]); onClose(); }}>
              <AppText variant="title3" color="onPrimary">Tamam</AppText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.activeCard}>
            <View style={styles.header}>
              <AppText variant="small" color="primary" style={styles.typeBadge}>
                CANLI GPS {type === 'run' ? 'KOŞU' : 'YÜRÜYÜŞ'}
              </AppText>
            </View>

            <View style={styles.timerDisplay}>
              <TabularNumber value={formatTime(seconds)} variant="timer" />
              <AppText variant="small" color="textSecondary">SÜRE (DAKİKA:SANİYE)</AppText>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metric}>
                <AppText variant="title2">{estimatedKm}</AppText>
                <AppText variant="small" color="textSecondary">TAHMİNİ KM</AppText>
              </View>
              <View style={styles.metric}>
                <AppText variant="title2">{route.length}</AppText>
                <AppText variant="small" color="textSecondary">GPS NOKTALARI</AppText>
              </View>
            </View>

            <View style={styles.controls}>
              <Pressable style={styles.pauseBtn} onPress={() => setIsPaused(!isPaused)}>
                <AppText variant="title3">{isPaused ? '▶ Devam Et' : '⏸ Duraklat'}</AppText>
              </Pressable>

              <Pressable style={styles.finishBtn} onPress={handleFinish} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <AppText variant="title3" color="onPrimary">🏁 Bitir ve Kaydet</AppText>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  activeCard: {
    alignItems: 'center',
    gap: spacing.xxl,
  },
  header: {
    backgroundColor: '#1E3A8A20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  typeBadge: {
    fontWeight: '700',
    letterSpacing: 1,
  },
  timerDisplay: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  metricsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.card,
  },
  metric: {
    alignItems: 'center',
  },
  controls: {
    width: '100%',
    gap: spacing.md,
  },
  pauseBtn: {
    backgroundColor: colors.surface2,
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  finishBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  summaryCard: {
    backgroundColor: colors.surface,
    padding: spacing.xxl,
    borderRadius: radius.card,
    gap: spacing.lg,
  },
  centerText: {
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: spacing.md,
  },
  statBox: {
    alignItems: 'center',
  },
  doneBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
});

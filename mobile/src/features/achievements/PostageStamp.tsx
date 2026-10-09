import type { Ref } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { achievements } from '@/i18n';
import { colors, fontFamily, typography } from '@/theme';
import type { Badge } from '@/types';

import { DatePostmark } from './DatePostmark';
import { formatLongDate, formatStampDate } from './formatBadgeDate';
import { StampArt } from './StampArt';
import { stampMetrics, stampTilt } from './stampGeometry';
import { LOCKED_TONE, STAMP_TONES, toneKeyFor } from './stampTones';

type Props = {
  badge: Badge;
  /** Pulun genişliği (dp); yükseklik orandan gelir. */
  width: number;
  /** Verilirse pul dokunulabilir (düğme); verilmezse sadece görüntü (sheet içinde). */
  onPress?: () => void;
  testID?: string;
  /** Sadece görüntü modunda (onPress yok): ekran okuyucu odağı için kök görünüm. */
  ref?: Ref<View>;
};

/** Ekran okuyucu etiketi: "10 ağaç kahramanı, kilitli, nasıl kazanılır: ..." / "İlk 5 km, kazanıldı, 23 Ağustos 2026". */
export function stampAccessibilityLabel(badge: Badge): string {
  if (badge.earned) return achievements.stamp.earnedLabel(badge.name, formatLongDate(badge.earnedAt));
  return achievements.stamp.lockedLabel(badge.name, badge.description);
}

/**
 * Posta pulu biçiminde rozet. Kazanılan: renkli, motifli, tarih damgalı. Kilitli: soluk, koyu siluet ve nasıl kazanılacağı.
 * Eğim rozet id'sinden deterministik (±1-3°).
 */
export function PostageStamp({ badge, width, onPress, testID, ref }: Props) {
  const m = stampMetrics(width);
  const earned = badge.earned;
  const tone = earned ? STAMP_TONES[toneKeyFor(badge.id)] : LOCKED_TONE;
  const stampDate = earned ? formatStampDate(badge.earnedAt) : null;
  const tilt = stampTilt(badge.id);
  const label = stampAccessibilityLabel(badge);

  const body = (
    <>
      <StampArt metrics={m} tone={tone} badgeId={badge.id} locked={!earned} />
      {!earned ? (
        <View pointerEvents="none" style={[styles.lockedTag, { left: m.pad, width: m.fieldW, top: m.pad + m.fieldH - 22 }]}>
          <AppText variant="small" color="textTertiary" maxFontSizeMultiplier={1.15}>
            {achievements.stamp.locked}
          </AppText>
        </View>
      ) : null}
      <View
        pointerEvents="none"
        style={[styles.text, { left: m.pad, width: earned && stampDate ? m.earnedNameWidth : m.fieldW, top: m.nameTop }]}>
        <AppText
          variant="secondary"
          numberOfLines={2}
          maxFontSizeMultiplier={1.15}
          style={[styles.name, { color: earned ? tone.ink : colors.textSecondary }]}>
          {badge.name}
        </AppText>
        {!earned ? (
          <AppText variant="small" color="textSecondary" numberOfLines={m.hintLines} maxFontSizeMultiplier={1.15} style={styles.hint}>
            {badge.description}
          </AppText>
        ) : null}
      </View>
      {stampDate ? (
        <View pointerEvents="none" style={[styles.postmark, { left: m.postmarkLeft, top: m.postmarkTop }]}>
          <DatePostmark dayMonth={stampDate.dayMonth} year={stampDate.year} size={m.postmark} ink={tone.ink} />
        </View>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        testID={testID}
        style={({ pressed }) => [
          { width, height: m.height },
          { transform: [{ rotate: `${tilt}deg` }, { scale: pressed ? 0.97 : 1 }] },
        ]}>
        {body}
      </Pressable>
    );
  }
  return (
    <View
      ref={ref}
      accessible
      accessibilityLabel={label}
      testID={testID}
      style={[{ width, height: m.height }, { transform: [{ rotate: `${tilt}deg` }] }]}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  text: { position: 'absolute' },
  name: { fontFamily: fontFamily.semiBold, lineHeight: typography.secondary.lineHeight },
  hint: { marginTop: 2 },
  lockedTag: { position: 'absolute', alignItems: 'center' },
  postmark: { position: 'absolute' },
});

import { StyleSheet, View } from 'react-native';

import type { Badge } from '@/types';
import { spacing } from '@/theme';

import { PostageStamp } from './PostageStamp';

type Props = {
  badges: Badge[];
  /** Izgaranın içerik genişliği (dp). */
  width: number;
  onSelect: (badge: Badge) => void;
};

/** Sütunlar arası ve satırlar arası geniş boşluk; sağ sütun elle yapıştırılmış gibi biraz aşağıda durur. */
export const STAMP_COLUMN_GAP = spacing.xxl;
const ROW_GAP = spacing.xxxl;
const RIGHT_COLUMN_DROP = spacing.xl;

/** Sütun genişliğinden pul genişliği. */
export function stampWidthFor(contentWidth: number): number {
  return Math.floor((contentWidth - STAMP_COLUMN_GAP) / 2);
}

/** Pulları 2 sütun ızgarada sıralar. Kart/çerçeve yok; pullar kendi başına durur. */
export function StampGrid({ badges, width, onSelect }: Props) {
  const stampWidth = stampWidthFor(width);
  const rows: Badge[][] = [];
  for (let i = 0; i < badges.length; i += 2) rows.push(badges.slice(i, i + 2));

  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={row[0].id} style={styles.row}>
          {row.map((badge, col) => (
            <View key={badge.id} style={col === 1 ? styles.drop : undefined}>
              <PostageStamp
                badge={badge}
                width={stampWidth}
                onPress={() => onSelect(badge)}
                testID={`stamp-${badge.id}`}
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { rowGap: ROW_GAP, paddingBottom: RIGHT_COLUMN_DROP },
  row: { flexDirection: 'row', alignItems: 'flex-start', columnGap: STAMP_COLUMN_GAP },
  drop: { marginTop: RIGHT_COLUMN_DROP },
});

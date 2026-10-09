import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { AppText } from '@/components/AppText';
import { trFeed } from '@/i18n';
import { colors, spacing } from '@/theme';
import { illustration } from '@/theme/illustration';

/** En çok bu kadar glif çizilir, fazlası "+N" olur. */
export const MAX_TREE_GLYPHS = 5;

const GLYPH_WIDTH = 14;
const GLYPH_HEIGHT = 18;
/** Gliflerin boyu hafif farklı: dizilmiş değil, dikilmiş görünür. */
const HEIGHT_SCALE = [1, 0.86, 1.06, 0.92, 1] as const;
const LEAF_FILLS = [illustration.forest[3], illustration.forest[2]] as const;

function Glyph({ index }: { index: number }) {
  const scale = HEIGHT_SCALE[index % HEIGHT_SCALE.length];
  return (
    <Svg
      width={GLYPH_WIDTH * scale}
      height={GLYPH_HEIGHT * scale}
      viewBox="0 0 14 18"
      testID="tree-glyph">
      <Path
        d="M7 1.5 L11.2 7.6 H9.2 L12.8 12.8 H1.2 L4.8 7.6 H2.8 Z"
        fill={LEAF_FILLS[index % LEAF_FILLS.length]}
        stroke={LEAF_FILLS[index % LEAF_FILLS.length]}
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <Rect x={6} y={12.5} width={2} height={4.5} rx={0.6} fill={colors.bark} />
    </Svg>
  );
}

type Props = { count: number };

/** Kazanılan ağaç sayısı kadar küçük ağaç glifi (en çok 5) ve fazlası için "+N". */
export function TreeGlyphs({ count }: Props) {
  const total = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0));
  if (total === 0) return null;
  const shown = Math.min(total, MAX_TREE_GLYPHS);
  const extra = total - shown;
  return (
    <View accessible accessibilityLabel={trFeed.trees.a11y(total)} style={styles.row} testID="tree-glyphs">
      {Array.from({ length: shown }, (_, i) => (
        <Glyph key={i} index={i} />
      ))}
      {extra > 0 ? (
        <AppText variant="small" color="textSecondary" style={styles.more}>
          {trFeed.trees.more(extra)}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  more: { marginLeft: spacing.xs },
});

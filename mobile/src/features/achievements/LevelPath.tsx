import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { AppText } from '@/components/AppText';
import { achievements } from '@/i18n';
import { colors } from '@/theme';
import type { LevelName } from '@/types';

import { levelGlyphSizes } from './layout';
import { LevelGlyph } from './LevelGlyph';
import { LEVEL_ORDER } from './levelCopy';

type Props = { current: LevelName };

type StopState = 'done' | 'current' | 'future';

const TRACK_HEIGHT = 16;
const FUTURE_OPACITY = 0.32;

function Connector({ reached }: { reached: boolean }) {
  return (
    <View pointerEvents="none" style={styles.connector}>
      <Svg width="100%" height={4}>
        <Line
          x1="0"
          y1="2"
          x2="100%"
          y2="2"
          stroke={reached ? colors.bark : colors.divider}
          strokeWidth={reached ? 2.5 : 2}
          strokeLinecap="round"
          strokeDasharray={reached ? undefined : [1, 6]}
        />
      </Svg>
    </View>
  );
}

function Stop({ level, state, last, currentSize, otherSize }: { level: LevelName; state: StopState; last: boolean; currentSize: number; otherSize: number }) {
  const isCurrent = state === 'current';
  return (
    <View style={styles.stop}>
      <View style={[styles.glyphBox, { height: currentSize, opacity: state === 'future' ? FUTURE_OPACITY : 1 }]}>
        <LevelGlyph level={level} size={isCurrent ? currentSize : otherSize} active={isCurrent} />
      </View>
      <View style={styles.track}>
        {last ? null : <Connector reached={state !== 'future' && state !== 'current'} />}
        <View
          style={[
            styles.dot,
            state === 'done' && styles.dotDone,
            isCurrent && styles.dotCurrent,
            state === 'future' && styles.dotFuture,
          ]}
        />
      </View>
      <AppText
        variant={isCurrent ? 'title3' : 'secondary'}
        color={isCurrent ? 'text' : 'textTertiary'}
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}>
        {achievements.levels[level]}
      </AppText>
    </View>
  );
}

/** Tohum > Fidan > Ağaç > Orman yatay yolu. Tamamlanan duraklar dolu, bulunulan büyük, gelecekler soluk. */
export function LevelPath({ current }: Props) {
  const { width } = useWindowDimensions();
  const { currentSize, otherSize } = levelGlyphSizes(width);
  const currentIndex = LEVEL_ORDER.indexOf(current);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={achievements.path.label(achievements.levels[current])}
      style={styles.row}
      testID="level-path">
      {LEVEL_ORDER.map((level, i) => (
        <Stop
          key={level}
          level={level}
          state={i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'future'}
          last={i === LEVEL_ORDER.length - 1}
          currentSize={currentSize}
          otherSize={otherSize}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  stop: { flex: 1, alignItems: 'center' },
  glyphBox: { justifyContent: 'flex-end', alignItems: 'center' },
  track: { height: TRACK_HEIGHT, width: '100%', alignItems: 'center', justifyContent: 'center' },
  connector: { position: 'absolute', left: '50%', width: '100%', top: (TRACK_HEIGHT - 4) / 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotDone: { backgroundColor: colors.bark },
  dotCurrent: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
  },
  dotFuture: { backgroundColor: colors.canvas, borderWidth: 1.5, borderColor: colors.divider },
});

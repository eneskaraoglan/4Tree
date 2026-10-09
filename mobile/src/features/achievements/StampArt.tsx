import { memo, useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

import { perforatedPath, type StampMetrics } from './stampGeometry';
import { StampMotif } from './stampMotifs';
import type { StampTone } from './stampTones';

type Props = {
  metrics: StampMetrics;
  tone: StampTone;
  badgeId: string;
  locked: boolean;
};

/** Pulun çizimi: tırtıklı kağıt, baskı alanı, ince iç çerçeve ve rozet motifi. Süstür, ekran okuyucudan gizli. */
function StampArtBase({ metrics, tone, badgeId, locked }: Props) {
  const { width, height, pad, fieldW, fieldH, notchR, pitch } = metrics;
  const paperPath = useMemo(() => perforatedPath(width, height, notchR, pitch), [width, height, notchR, pitch]);
  const motifSize = Math.min(fieldW, fieldH) * 0.62;

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, top: 0 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Path
        d={paperPath}
        fill={tone.paper}
        stroke={locked ? colors.divider : undefined}
        strokeWidth={locked ? 0.8 : 0}
      />
      <Rect x={pad} y={pad} width={fieldW} height={fieldH} rx={2} fill={tone.field} />
      <Rect
        x={pad + 4}
        y={pad + 4}
        width={fieldW - 8}
        height={fieldH - 8}
        rx={1}
        fill="none"
        stroke={tone.frame}
        strokeOpacity={locked ? 0.7 : 0.45}
        strokeWidth={0.8}
        strokeDasharray={locked ? [2, 3] : undefined}
      />
      <StampMotif
        id={badgeId}
        color={tone.motif}
        accent={tone.accent}
        x={pad + (fieldW - motifSize) / 2}
        y={pad + (fieldH - motifSize) / 2 - (locked ? 5 : 0)}
        size={motifSize}
      />
    </Svg>
  );
}

export const StampArt = memo(StampArtBase);

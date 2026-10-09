import type { ComponentType } from 'react';
import { Circle, Ellipse, G, Line, Path, Polyline, Rect } from 'react-native-svg';

/** Pul motifleri 48x48 birimlik kutuda çizilir; renkler pulun tonundan gelir (kilitlide tek koyu siluet rengi). */
export const MOTIF_BOX = 48;

type MotifProps = { color: string; accent: string };

const W = 2.2;

function Trail({ color, accent }: MotifProps) {
  return (
    <>
      <Path d="M9 41 C21 41 13 29 24 28 S35 21 33 14" fill="none" stroke={color} strokeWidth={2.8} strokeLinecap="round" strokeDasharray={[0.1, 5]} />
      <Circle cx={9} cy={41} r={2.8} fill={color} />
      <Line x1={33} y1={14} x2={33} y2={5} stroke={color} strokeWidth={W} strokeLinecap="round" />
      <Path d="M33 5.5 L43 9 L33 12.5Z" fill={accent} stroke={accent} strokeWidth={1} strokeLinejoin="round" />
    </>
  );
}

function Sapling({ color, accent }: MotifProps) {
  return (
    <>
      <Path d="M24 41 C24 33 25.5 28 24 19" fill="none" stroke={color} strokeWidth={W} strokeLinecap="round" />
      <Path d="M24 29 C16 30 11 25 10 17 C18 16 23 21 24 29Z" fill={color} />
      <Path d="M24 22.5 C25 14 31 10 38 11 C37 18.5 31 22.5 24 22.5Z" fill={accent} />
      <Path d="M12 41.5 H36" stroke={color} strokeWidth={W} strokeLinecap="round" strokeOpacity={0.6} />
    </>
  );
}

function Sunrise({ color, accent }: MotifProps) {
  const rays = Array.from({ length: 7 }, (_, i) => {
    const a = (-180 + (i + 1) * (180 / 8)) * (Math.PI / 180);
    return { x1: 24 + Math.cos(a) * 11.5, y1: 25 + Math.sin(a) * 11.5, x2: 24 + Math.cos(a) * 16, y2: 25 + Math.sin(a) * 16 };
  });
  return (
    <>
      {rays.map((r, i) => (
        <Line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke={accent} strokeWidth={1.8} strokeLinecap="round" />
      ))}
      <Path d="M12.5 25 A11.5 11.5 0 0 1 35.5 25Z" fill={accent} />
      <Path d="M4 43 C12 32 19 32 25 38 C31 33 39 33 44 40 L44 44 L4 44Z" fill={color} />
    </>
  );
}

function Rings({ color, accent }: MotifProps) {
  return (
    <>
      <Ellipse cx={24} cy={24.5} rx={18.5} ry={16.5} fill="none" stroke={color} strokeWidth={W} transform="rotate(-14 24 24)" />
      <Ellipse cx={23.5} cy={24} rx={13} ry={11.8} fill="none" stroke={color} strokeWidth={W - 0.4} transform="rotate(10 24 24)" />
      <Ellipse cx={24.5} cy={24.5} rx={7.6} ry={7} fill="none" stroke={color} strokeWidth={W - 0.6} transform="rotate(-22 24 24)" />
      <Circle cx={24} cy={24.5} r={2.4} fill={accent} />
    </>
  );
}

function EarlyBird({ color, accent }: MotifProps) {
  return (
    <>
      <Path d="M11 37 A13 13 0 0 1 37 37Z" fill={accent} />
      <Line x1={5} y1={37} x2={43} y2={37} stroke={color} strokeWidth={W} strokeLinecap="round" />
      <Line x1={14} y1={42} x2={34} y2={42} stroke={color} strokeWidth={W} strokeLinecap="round" strokeOpacity={0.55} />
      <Path d="M13 15 Q17.5 9 22 15 Q26.5 9 31 15" fill="none" stroke={color} strokeWidth={W} strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

function PineHero({ color, accent }: MotifProps) {
  return (
    <>
      <Path d="M24 5 L32 17 H16Z M24 12 L35 27 H13Z M24 21 L38 37 H10Z" fill={color} stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Rect x={21.8} y={37.5} width={4.4} height={6} rx={1} fill={accent} />
    </>
  );
}

function Track({ color, accent }: MotifProps) {
  return (
    <>
      <Rect x={6} y={13} width={36} height={23} rx={11.5} fill="none" stroke={color} strokeWidth={W} />
      <Rect x={13} y={19.5} width={22} height={10} rx={5} fill="none" stroke={color} strokeWidth={1.4} strokeOpacity={0.6} />
      <Circle cx={36} cy={13} r={3.6} fill={accent} />
    </>
  );
}

function Streak({ color, accent }: MotifProps) {
  const dots = Array.from({ length: 7 }, (_, i) => ({ x: 7 + i * 5.7, y: 36 - i * 4 - (i % 2) * 1.5 }));
  return (
    <>
      <Polyline points={dots.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={color} strokeWidth={1.4} strokeOpacity={0.7} strokeLinejoin="round" />
      {dots.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={i === 6 ? 3.8 : 2.6} fill={i === 6 ? accent : color} />
      ))}
    </>
  );
}

function ForestKeeper({ color, accent }: MotifProps) {
  return (
    <>
      <Path d="M11 18 L19 33 H3Z M38 20 L46 34 H30Z" fill={accent} stroke={accent} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M24 6 L34 22 H14Z M24 16 L37 36 H11Z" fill={color} stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Line x1={4} y1={41.5} x2={44} y2={41.5} stroke={color} strokeWidth={W} strokeLinecap="round" strokeOpacity={0.6} />
    </>
  );
}

/** Eşlemesi olmayan rozetler için yaprak. */
function Leaf({ color, accent }: MotifProps) {
  return (
    <>
      <Path d="M24 41 C10 33 10 15 24 6 C38 15 38 33 24 41Z" fill={color} />
      <Path d="M24 38 C24.5 28 24 18 24 12" fill="none" stroke={accent} strokeWidth={1.6} strokeLinecap="round" />
    </>
  );
}

const MOTIFS: Record<string, ComponentType<MotifProps>> = {
  'first-5k': Trail,
  'first-tree': Sapling,
  'weekend-warrior': Sunrise,
  'km-100': Rings,
  'early-bird': EarlyBird,
  'tree-hero-10': PineHero,
  'half-marathon': Track,
  'streak-7': Streak,
  'forest-keeper': ForestKeeper,
};

export const STAMP_MOTIF_IDS: readonly string[] = Object.keys(MOTIFS);

type StampMotifProps = MotifProps & {
  id: string;
  /** Motifin yerleşeceği kutunun sol-üst köşesi ve kenarı (stamp birimi). */
  x: number;
  y: number;
  size: number;
};

/** Rozet id'sine göre motifi verilen kutuya yerleştirir. */
export function StampMotif({ id, color, accent, x, y, size }: StampMotifProps) {
  const Motif = MOTIFS[id] ?? Leaf;
  return (
    <G transform={`translate(${x} ${y}) scale(${size / MOTIF_BOX})`}>
      <Motif color={color} accent={accent} />
    </G>
  );
}

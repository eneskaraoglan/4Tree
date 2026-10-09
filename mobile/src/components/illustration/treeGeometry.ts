import { colors } from '@/theme';
import { illustration, mixHex } from '@/theme/illustration';

import { createRng, lerp } from './random';
import { closedShapePath, wobblyEllipse, type Pt } from './shapes';

/** Ağaç 100x100 birimlik viewBox'ta çizilir; gövde tabanı (50, 98). */
export const TREE_VIEWBOX = 100;

export type TreeSpecies = 'cam' | 'meşe' | 'çınar';
export const TREE_SPECIES: readonly TreeSpecies[] = ['cam', 'meşe', 'çınar'];

/** Büyüme zaman çizelgesi penceresi (0-1, toplam animasyon süresine göre). */
type Window = readonly [number, number];

export type StrokePart = { d: string; length: number; width: number; window: Window };

export type FoliagePart = {
  /** Düz [x, y, ...] noktaları (mutlak, viewBox birimi). */
  pts: number[];
  cx: number;
  cy: number;
  smooth: boolean;
  fill: string;
  opacity: number;
  /** Çam katlarının uçlarını yuvarlayan ince kontur. */
  joinWidth: number;
  /** Statik çizim için hazır yol (ölçek 1). */
  d: string;
  window: Window;
};

export type TreeShape = {
  /** Gövde + dalların tek parça dolgulu çizimi (statik). */
  woodPath: string;
  woodFill: string;
  /** Aynı odunun, büyüme animasyonunda sırayla çizilen kalın çizgi parçaları. */
  strokes: StrokePart[];
  foliage: FoliagePart[];
};

type Limb = { samples: Pt[]; widths: number[] };

type Build = {
  limbs: Limb[];
  /** Her limb için zaman çizelgesi penceresi. */
  limbWindows: Window[];
  foliage: Omit<FoliagePart, 'd' | 'window'>[];
};

function jit(rng: () => number, amount: number): number {
  return (rng() * 2 - 1) * amount;
}

/** Kuadratik Bezier boyunca n parçalı, kalınlığı azalan dal. */
function limb(p0: Pt, c: Pt, p1: Pt, w0: number, w1: number, n: number): Limb {
  const samples: Pt[] = [];
  const widths: number[] = [];
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const u = 1 - t;
    samples.push([u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]]);
    widths.push(lerp(w0, w1, t));
  }
  return { samples, widths };
}

function limbOutline(l: Limb): string {
  const left: string[] = [];
  const right: string[] = [];
  const n = l.samples.length;
  for (let i = 0; i < n; i += 1) {
    const a = l.samples[Math.max(0, i - 1)];
    const b = l.samples[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const half = l.widths[i] / 2;
    const [px, py] = l.samples[i];
    left.push(`${(px + nx * half).toFixed(2)} ${(py + ny * half).toFixed(2)}`);
    right.push(`${(px - nx * half).toFixed(2)} ${(py - ny * half).toFixed(2)}`);
  }
  return `M${left.join('L')}L${right.reverse().join('L')}Z`;
}

function limbStrokes(l: Limb, window: Window): StrokePart[] {
  const n = l.samples.length - 1;
  const out: StrokePart[] = [];
  for (let i = 0; i < n; i += 1) {
    const [x0, y0] = l.samples[i];
    const [x1, y1] = l.samples[i + 1];
    out.push({
      d: `M${x0.toFixed(2)} ${y0.toFixed(2)}L${x1.toFixed(2)} ${y1.toFixed(2)}`,
      length: Math.hypot(x1 - x0, y1 - y0),
      width: (l.widths[i] + l.widths[i + 1]) / 2,
      window: [lerp(window[0], window[1], i / n), lerp(window[0], window[1], (i + 1) / n)],
    });
  }
  return out;
}

function foliageBlob(
  rng: () => number,
  flip: (x: number) => number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fill: string,
  opacity = 1,
): Build['foliage'][number] {
  const size = 0.9 + rng() * 0.2;
  const x = flip(cx + jit(rng, 2.2));
  const y = cy + jit(rng, 2);
  return {
    pts: wobblyEllipse(rng, x, y, rx * size, ry * size, 9, 0.12),
    cx: x,
    cy: y,
    smooth: true,
    fill,
    opacity,
    joinWidth: 0,
  };
}

const { forest, autumn } = illustration;

/** Çam: dümdüz, dar konik gövde; üst üste binen sarkık katlar. */
function buildPine(rng: () => number, flip: (x: number) => number, mirrored: boolean): Build {
  const lean = jit(rng, 1.8);
  const trunk = limb([flip(50), 98], [flip(50 + lean * 0.4), 62], [flip(50 + lean), 26], 5.2, 2, 5);
  const tiers = 5 + (rng() < 0.5 ? 1 : 0);
  const foliage: Build['foliage'] = [];
  for (let i = 0; i < tiers; i += 1) {
    const t = i / (tiers - 1);
    const cy = lerp(77, 26, t) + jit(rng, 1.1);
    const cx = 50 + (lean * (98 - cy)) / 72 + jit(rng, 1.3);
    const hw = lerp(27, 10, t) * (0.93 + rng() * 0.14);
    const h = lerp(27, 19, t);
    const x = (dx: number) => flip(cx + dx);
    const apex: Pt = [x(jit(rng, 0.8)), cy - h * 0.62];
    const midR: Pt = [x(hw * 0.5 + jit(rng, 1)), cy + h * 0.02];
    const brR: Pt = [x(hw), cy + h * 0.4 + jit(rng, 0.8)];
    const scallop: Pt[] = [
      [x(hw * 0.52), cy + h * 0.29 + jit(rng, 0.7)],
      [x(hw * 0.18), cy + h * 0.45 + jit(rng, 0.7)],
      [x(-hw * 0.2), cy + h * 0.3 + jit(rng, 0.7)],
      [x(-hw * 0.55), cy + h * 0.44 + jit(rng, 0.7)],
    ];
    const brL: Pt = [x(-hw), cy + h * 0.4 + jit(rng, 0.8)];
    const midL: Pt = [x(-hw * 0.5 + jit(rng, 1)), cy + h * 0.02];
    const outline = [apex, midR, brR, ...scallop, brL, midL];
    const darkBase = i % 2 === 0 ? mixHex(forest[0], colors.canvas, 0.25) : mixHex(forest[0], forest[1], 0.4);
    const centerX = flip(cx);
    foliage.push({
      pts: outline.flatMap((p) => [p[0], p[1]]),
      cx: centerX,
      cy,
      smooth: false,
      fill: darkBase,
      opacity: 1,
      joinWidth: 1.5,
    });
    // Işık hep ekranın solundan: aynalı ağaçta da katın sol yarısı daha açık.
    const side = mirrored ? -1 : 1;
    const lit: Pt[] = [
      apex,
      [x(side * -hw * 0.5), cy + h * 0.02],
      [x(side * -hw), cy + h * 0.4],
      [x(side * -hw * 0.55), cy + h * 0.38],
      [x(side * -hw * 0.1), cy + h * 0.08],
    ];
    foliage.push({
      pts: lit.flatMap((p) => [p[0], p[1]]),
      cx: centerX,
      cy,
      smooth: false,
      fill: mixHex(forest[1], forest[2], 0.5 + t * 0.4),
      opacity: 0.85,
      joinWidth: 1,
    });
  }
  return { limbs: [trunk], limbWindows: [[0, 0.4]], foliage };
}

type BlobSpec = readonly [number, number, number, number];
type CrownLayer = { specs: readonly BlobSpec[]; fill: string; opacity?: number; autumn?: 'accent' | 'edge' };

/**
 * Katman katman yaprak öbekleri. Bazı ağaçlarda (tohuma bağlı) sonbahar vurgusu olur:
 * çoğunlukla 2-3 küçük öbek, nadiren tüm taç kenarları kehribar ya da pas rengine döner.
 * `autumn: 'accent'` katmandaki her öbek aday; `'edge'` katmanda sadece küçük (kenar) öbekler.
 */
function crownFromSpecs(rng: () => number, flip: (x: number) => number, layers: CrownLayer[]): Build['foliage'] {
  const accents: number[] = [];
  const edges: number[] = [];
  let index = 0;
  for (const layer of layers) {
    for (const spec of layer.specs) {
      if (layer.autumn === 'accent') accents.push(index);
      if (layer.autumn === 'edge' && spec[2] <= 17) edges.push(index);
      index += 1;
    }
  }
  const roll = rng();
  const autumnSet = new Set<number>();
  if (roll < 0.26) {
    const wanted = 2 + (rng() < 0.4 ? 1 : 0);
    for (let i = 0; i < wanted; i += 1) autumnSet.add(accents[Math.floor(rng() * accents.length)]);
  } else if (roll < 0.33) {
    for (const i of accents) autumnSet.add(i);
    for (const i of edges) autumnSet.add(i);
  }
  const tone = rng() < 0.5 ? autumn.amber : autumn.rust;
  const toneLight = mixHex(tone, colors.gold, 0.45);

  const out: Build['foliage'] = [];
  index = 0;
  for (const layer of layers) {
    for (const [cx, cy, rx, ry] of layer.specs) {
      const fill = autumnSet.has(index) ? (layer.opacity ? toneLight : tone) : layer.fill;
      out.push(foliageBlob(rng, flip, cx, cy, rx, ry, fill, layer.opacity ?? 1));
      index += 1;
    }
  }
  return out;
}

/** Meşe: kalın kısa gövde, iki yana açılan dallar, geniş ve alçak bulut gibi taç. */
function buildOak(rng: () => number, flip: (x: number) => number): Build {
  const lean = jit(rng, 2);
  const tx = 50 + lean;
  const trunk = limb([flip(50), 98], [flip(50 + jit(rng, 1.5)), 82], [flip(tx), 64], 14, 8.4, 5);
  const left = limb([flip(tx - 1), 66], [flip(35 + jit(rng, 2)), 58], [flip(20 + jit(rng, 3)), 44 + jit(rng, 3)], 6, 2.2, 3);
  const right = limb([flip(tx + 1), 66], [flip(65 + jit(rng, 2)), 57], [flip(80 + jit(rng, 3)), 42 + jit(rng, 3)], 6, 2.2, 3);
  const middle = limb([flip(tx), 68], [flip(47 + jit(rng, 2)), 54], [flip(50 + jit(rng, 3)), 36 + jit(rng, 3)], 5, 2, 3);
  const foliage = crownFromSpecs(rng, flip, [
    {
      specs: [[24, 54, 17, 11], [50, 58, 21, 11], [76, 54, 17, 11]],
      fill: mixHex(forest[1], forest[2], 0.35),
    },
    {
      specs: [[21, 46, 17, 13], [41, 36, 19, 14], [62, 35, 19, 14], [80, 46, 17, 13], [50, 48, 23, 15]],
      fill: forest[2],
      autumn: 'edge',
    },
    {
      specs: [[35, 31, 10, 7], [58, 29, 10, 7], [77, 39, 8, 6], [23, 38, 8, 6], [48, 40, 9, 6]],
      fill: forest[3],
      opacity: 0.82,
      autumn: 'accent',
    },
  ]);
  return {
    limbs: [trunk, left, right, middle],
    limbWindows: [[0, 0.3], [0.2, 0.36], [0.24, 0.4], [0.28, 0.44]],
    foliage,
  };
}

/** Çınar: uzun, düz gövde; yüksekte vazo gibi açılan, loblu ve daha açık yeşil taç. */
function buildPlane(rng: () => number, flip: (x: number) => number): Build {
  const lean = jit(rng, 1.8);
  const tx = 50 + lean;
  const trunk = limb([flip(50), 98], [flip(50 + jit(rng, 1.2)), 76], [flip(tx), 50], 10.5, 4.8, 6);
  const left = limb([flip(tx), 52], [flip(42 + jit(rng, 2)), 42], [flip(28 + jit(rng, 3)), 27 + jit(rng, 2)], 3.8, 1.5, 3);
  const right = limb([flip(tx), 52], [flip(58 + jit(rng, 2)), 41], [flip(72 + jit(rng, 3)), 25 + jit(rng, 2)], 3.8, 1.5, 3);
  const middle = limb([flip(tx), 50], [flip(50 + jit(rng, 2)), 34], [flip(50 + jit(rng, 3)), 16 + jit(rng, 2)], 3.4, 1.4, 3);
  const foliage = crownFromSpecs(rng, flip, [
    {
      specs: [[35, 40, 11, 9], [50, 43, 13, 8], [65, 40, 11, 9]],
      fill: mixHex(forest[2], forest[3], 0.25),
    },
    {
      specs: [[36, 31, 13, 11], [50, 17, 14, 12], [64, 29, 13, 11], [43, 37, 12, 10], [58, 37, 12, 10], [30, 41, 9, 7], [70, 41, 9, 7], [43, 24, 11, 9], [58, 23, 10, 9]],
      fill: forest[3],
      autumn: 'edge',
    },
    {
      specs: [[44, 12, 7, 5], [58, 19, 7, 5], [36, 25, 6, 4.5], [62, 31, 6, 4.5], [50, 28, 7, 4.5]],
      fill: forest[4],
      opacity: 0.6,
      autumn: 'accent',
    },
  ]);
  return {
    limbs: [trunk, left, right, middle],
    limbWindows: [[0, 0.3], [0.2, 0.36], [0.24, 0.4], [0.28, 0.44]],
    foliage,
  };
}

const BUILDERS: Record<TreeSpecies, (rng: () => number, flip: (x: number) => number, mirrored: boolean) => Build> = {
  cam: buildPine,
  meşe: buildOak,
  çınar: buildPlane,
};

const SPECIES_SALT: Record<TreeSpecies, number> = { cam: 101, meşe: 211, çınar: 307 };

function hazeColor(color: string, haze: number): string {
  return haze > 0 ? mixHex(color, illustration.haze, haze) : color;
}

/**
 * Tür + tohum + sis oranından ağaç geometrisi üretir. Saf fonksiyondur: aynı girdi aynı sonucu verir.
 * Tohum: yatay çevirme, eğim, boyut, kat sayısı, renk tonu ve sonbahar vurgusunu değiştirir.
 */
export function buildTree(species: TreeSpecies, seed: number, haze = 0): TreeShape {
  const rng = createRng((Number.isFinite(seed) ? Math.floor(seed) : 0) * 2654435761 + SPECIES_SALT[species]);
  const mirrored = rng() < 0.5;
  const flip = (x: number) => (mirrored ? TREE_VIEWBOX - x : x);
  const build = BUILDERS[species](rng, flip, mirrored);

  const woodFill = hazeColor(mixHex(colors.bark, colors.canvas, 0.22), haze);
  const strokes = build.limbs.flatMap((l, i) => limbStrokes(l, build.limbWindows[i]));
  const woodPath = build.limbs.map(limbOutline).join('');

  const count = build.foliage.length;
  const foliage: FoliagePart[] = build.foliage.map((blob, i) => {
    const start = 0.38 + (i / count) * 0.36;
    return {
      ...blob,
      fill: hazeColor(blob.fill, haze),
      d: closedShapePath(blob.pts, blob.cx, blob.cy, 1, blob.smooth),
      window: [start, start + 0.26],
    };
  });

  return {
    woodPath,
    woodFill,
    strokes,
    foliage,
  };
}

import { createRng, hashString } from './random';
import { LAYER_COUNT, LAYER_TREE_SIZE, layerBand, ridgeY } from './scenery';
import type { TreeSpecies } from './treeGeometry';

export type ForestTreeInput = { id: string; species: TreeSpecies; seed: number };

export type PlacedTree = ForestTreeInput & {
  layer: number;
  /** Tree kutusunun kenarı (dp), en az MIN_TREE_SIZE; dokunma kutusu da bu kadardır. */
  size: number;
  /** Gövde tabanının yatay merkezi (px, sahnenin solundan). */
  x: number;
  /** Gövde tabanının dikey konumu (px, sahnenin üstünden). */
  baseY: number;
};

/** Aynı anda sallanan ağaç üst sınırı: her sallanma sonsuz bir UI animasyonudur. */
export const MAX_SWAYING_TREES = 8;
/** Sallanma sadece bu katmandan itibaren (yakın katmanlar) açılır; uzak katmanlar durağandır. */
export const FIRST_SWAYING_LAYER = 2;

/** Görsel ağaç kutusunun alt sınırı; dokunma alanı ayrıca en az 44 dp'dir. */
export const MIN_TREE_SIZE = 44;
const CANDIDATES = 24;
/** Katmanlara ağırlık: ön planda daha az, ortada daha çok ağaç. */
const LAYER_WEIGHTS = [0.14, 0.2, 0.24, 0.23, 0.19] as const;

function pickLayer(r: number): number {
  let acc = 0;
  for (let l = 0; l < LAYER_COUNT; l += 1) {
    acc += LAYER_WEIGHTS[l];
    if (r < acc) return l;
  }
  return LAYER_COUNT - 1;
}

/** Taç kutusu: ağacın görünen kısmı kutudan dar. */
function crownBox(t: Pick<PlacedTree, 'x' | 'baseY' | 'size'>) {
  const halfWidth = t.size * 0.3;
  return { left: t.x - halfWidth, right: t.x + halfWidth, top: t.baseY - t.size * 0.92, bottom: t.baseY };
}

/** İki ağacın taç kutularının örtüşme alanı / küçük ağacın kutu alanı (0 = hiç, 1 = tam üst üste). */
export function crownOverlap(a: PlacedTree, b: PlacedTree): number {
  const A = crownBox(a);
  const B = crownBox(b);
  const w = Math.min(A.right, B.right) - Math.max(A.left, B.left);
  const h = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
  if (w <= 0 || h <= 0) return 0;
  return (w * h) / (Math.min(a.size, b.size) ** 2);
}

function overlapCost(a: PlacedTree, b: PlacedTree): number {
  const area = crownOverlap(a, b);
  // Aynı katmandaki örtüşme (iki ağaç iç içe) farklı katmandakinden kötüdür.
  return a.layer === b.layer ? area * 2 : area * 0.6;
}

/**
 * Ağaçları tepelere dağıtır. Her ağacın konumu yalnızca kendi id/seed'ine ve kendinden önce
 * yerleşenlere bağlıdır: listenin sonuna ağaç eklemek önceki ağaçları oynatmaz.
 * Her ağaç için birkaç aday konum denenir, en az örtüşen seçilir.
 * Dönüş sırası çizim sırasıdır: uzak katman önce, aynı katmanda yukarıdaki önce.
 */
export function layoutForest(trees: readonly ForestTreeInput[], width: number, height: number): PlacedTree[] {
  if (!(width > 0) || !(height > 0)) return [];
  const placed: PlacedTree[] = [];

  for (const tree of trees) {
    const rng = createRng(hashString(tree.id) + Math.floor(Number.isFinite(tree.seed) ? tree.seed : 0) * 7919);
    let best: PlacedTree | null = null;
    let bestCost = Infinity;

    for (let c = 0; c < CANDIDATES; c += 1) {
      const layer = pickLayer(rng());
      const size = Math.max(MIN_TREE_SIZE, Math.round(height * LAYER_TREE_SIZE[layer] * (0.82 + rng() * 0.36)));
      // Dokunma kutusu (size >= 44) sahne kenarında kırpılmasın: merkez en az kutunun yarısı kadar içeride.
      const margin = Math.min(size / 2, width / 2);
      const x = margin + rng() * Math.max(0, width - margin * 2);
      const ridge = ridgeY(layer, x / width, height);
      const baseY = Math.min(height - 2, ridge + rng() * layerBand(layer, height) * 0.5 + 2);
      const candidate: PlacedTree = { ...tree, layer, size, x, baseY };
      let cost = 0;
      for (const other of placed) cost += overlapCost(candidate, other);
      if (cost < bestCost) {
        best = candidate;
        bestCost = cost;
        if (cost === 0) break;
      }
    }
    if (best) placed.push(best);
  }

  return placed
    .map((p, order) => ({ p, order }))
    .sort((a, b) => a.p.layer - b.p.layer || a.p.baseY - b.p.baseY || a.order - b.order)
    .map(({ p }) => p);
}

/** Sallanacak ağaçların id'leri: yalnızca yakın katmanlar, en yakından başlayarak en çok MAX_SWAYING_TREES. */
export function selectSwayingTrees(placed: readonly PlacedTree[]): Set<string> {
  const near = placed.filter((t) => t.layer >= FIRST_SWAYING_LAYER);
  near.sort((a, b) => b.layer - a.layer || b.baseY - a.baseY);
  return new Set(near.slice(0, MAX_SWAYING_TREES).map((t) => t.id));
}

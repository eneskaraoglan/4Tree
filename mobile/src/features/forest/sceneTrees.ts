import type { ForestSceneTree, TreeSpecies } from '@/components/illustration';
import { TREE_SPECIES } from '@/components/illustration';
import type { ForestTree } from '@/types';

/** Servisteki tür adı (küçük harf) -> çizim türü. Bilinmeyen türler hash ile belirlenir. */
const SPECIES_MAP: Record<string, TreeSpecies> = {
  'meşe': 'meşe',
  'kayın': 'meşe',
  'kızılçam': 'cam',
  'fıstık çamı': 'cam',
  'karaçam': 'cam',
  'zeytin': 'çınar',
  'kızılağaç': 'çınar',
  'çınar': 'çınar',
};

/** FNV-1a: aynı metin her zaman aynı pozitif sayıyı verir. */
export function hashText(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministik tür eşlemesi: aynı tür adı her zaman aynı çizimi verir. */
export function toTreeSpecies(species: string): TreeSpecies {
  const key = species.trim().toLocaleLowerCase('tr-TR');
  return SPECIES_MAP[key] ?? TREE_SPECIES[hashText(key) % TREE_SPECIES.length];
}

/** Ağacın çizim tohumu id'den gelir; sahne ve sheet aynı ağacı çizer. */
export function toSceneTree(tree: ForestTree): ForestSceneTree {
  return { id: tree.id, species: toTreeSpecies(tree.species), seed: hashText(tree.id) };
}

/**
 * Servis yeniden eskiye sıralı verir. Sahne yerleşimi sıraya bağlıdır (sona eklenen ağaç
 * öncekileri oynatmaz), bu yüzden eskiden yeniye çevirip verilir: yeni ağaç eskileri kaydırmaz.
 */
export function toSceneTrees(trees: readonly ForestTree[]): ForestSceneTree[] {
  return trees.map(toSceneTree).reverse();
}

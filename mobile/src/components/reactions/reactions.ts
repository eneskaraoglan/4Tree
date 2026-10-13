import type { ComponentType } from 'react';

import { trFeed } from '@/i18n';
import type { ColorToken } from '@/theme';
import type { ReactionCounts, ReactionType } from '@/types';

import {
  ClapIcon,
  HeartIcon,
  LeafIcon,
  PowerIcon,
  WaterIcon,
  type ReactionIconProps,
} from './ReactionIcons';

export type { ReactionCounts, ReactionType };

export type ReactionDefinition = {
  id: ReactionType;
  /** Türkçe etiket (i18n'den). */
  label: string;
  Icon: ComponentType<ReactionIconProps>;
  /** Tema renk token'ı; ekranda aynı anda çok parlak renk olmasın diye sade seçildi. */
  color: Extract<ColorToken, 'water' | 'gold' | 'primary' | 'danger' | 'bark'>;
  /** Seçicideki ve özetteki sıra (küçük önce). */
  order: number;
};

/** Tepki türlerinin TEK tanım yeri: sıra, etiket, ikon, renk. */
export const REACTIONS: Record<ReactionType, ReactionDefinition> = {
  water: { id: 'water', label: trFeed.reactions.labels.water, Icon: WaterIcon, color: 'water', order: 0 },
  clap: { id: 'clap', label: trFeed.reactions.labels.clap, Icon: ClapIcon, color: 'gold', order: 1 },
  leaf: { id: 'leaf', label: trFeed.reactions.labels.leaf, Icon: LeafIcon, color: 'primary', order: 2 },
  heart: { id: 'heart', label: trFeed.reactions.labels.heart, Icon: HeartIcon, color: 'danger', order: 3 },
  power: { id: 'power', label: trFeed.reactions.labels.power, Icon: PowerIcon, color: 'bark', order: 4 },
};

/** Varsayılan tepki: dokununca verilen (Su ver). */
export const DEFAULT_REACTION: ReactionType = 'water';

/** Tüm türler `order` sırasında. */
export const REACTION_TYPES: readonly ReactionType[] = (Object.values(REACTIONS) as ReactionDefinition[])
  .sort((a, b) => a.order - b.order)
  .map((r) => r.id);

/** Verilen türleri `order` sırasına dizer ve yinelenenleri atar. */
export function orderReactions(types: readonly ReactionType[]): ReactionType[] {
  return REACTION_TYPES.filter((id) => types.includes(id));
}

/** Sayısı 0'dan büyük türler ve toplam; sayılar geçersizse (negatif, NaN) 0 sayılır. */
export function summarizeCounts(counts: ReactionCounts): { type: ReactionType; count: number }[] {
  return REACTION_TYPES.flatMap((type) => {
    const raw = counts[type];
    const count = typeof raw === 'number' && Number.isFinite(raw) ? Math.floor(raw) : 0;
    return count > 0 ? [{ type, count }] : [];
  });
}

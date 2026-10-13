import { colors } from '@/theme';

import { DEFAULT_REACTION, orderReactions, REACTION_TYPES, REACTIONS, summarizeCounts } from './reactions';

describe('reactions kaydı', () => {
  it('beş tür, tanımlı sırada: Su ver, Alkışla, Yaprak, Kalp, Güç', () => {
    expect(REACTION_TYPES).toEqual(['water', 'clap', 'leaf', 'heart', 'power']);
    expect(REACTION_TYPES.map((t) => REACTIONS[t].label)).toEqual(['Su ver', 'Alkışla', 'Yaprak', 'Kalp', 'Güç']);
    expect(DEFAULT_REACTION).toBe('water');
  });

  it('renkler DESIGN.md token’larından: su=water, alkış=gold, yaprak=primary, kalp=danger, güç=bark', () => {
    expect(REACTIONS.water.color).toBe('water');
    expect(REACTIONS.clap.color).toBe('gold');
    expect(REACTIONS.leaf.color).toBe('primary');
    expect(REACTIONS.heart.color).toBe('danger');
    expect(REACTIONS.power.color).toBe('bark');
    for (const t of REACTION_TYPES) expect(colors[REACTIONS[t].color]).toMatch(/^#/);
  });

  it('her türün ikon bileşeni ve benzersiz sırası var', () => {
    expect(new Set(REACTION_TYPES.map((t) => REACTIONS[t].order)).size).toBe(5);
    for (const t of REACTION_TYPES) expect(typeof REACTIONS[t].Icon).toBe('function');
  });

  it('orderReactions sıraya dizer ve yinelenen/bilinmeyeni atar', () => {
    expect(orderReactions(['power', 'water', 'water', 'clap'])).toEqual(['water', 'clap', 'power']);
    expect(orderReactions([])).toEqual([]);
  });

  it('summarizeCounts 0, negatif ve geçersiz sayıları atar; sırayı korur', () => {
    expect(
      summarizeCounts({ power: 2, water: 0, clap: -3, leaf: Number.NaN, heart: 4.9 }),
    ).toEqual([
      { type: 'heart', count: 4 },
      { type: 'power', count: 2 },
    ]);
    expect(summarizeCounts({})).toEqual([]);
  });
});

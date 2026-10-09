import { getLevelProgress } from './levels';

describe('getLevelProgress', () => {
  it('0 km Tohum, ilerleme 0', () => {
    expect(getLevelProgress(0)).toEqual({ level: 'seed', nextLevel: 'sapling', progress: 0 });
  });
  it('60 km (3 ağaç) Fidan başlangıcı', () => {
    expect(getLevelProgress(60)).toEqual({ level: 'sapling', nextLevel: 'tree', progress: 0 });
  });
  it('200 km (10 ağaç) Ağaç seviyesi', () => {
    expect(getLevelProgress(200).level).toBe('tree');
  });
  it('500 km Orman, ilerleme 1, sonraki yok', () => {
    expect(getLevelProgress(500)).toEqual({ level: 'forest', nextLevel: null, progress: 1 });
  });
  it('negatif girdi reddedilir', () => {
    expect(() => getLevelProgress(-1)).toThrow(RangeError);
  });
});

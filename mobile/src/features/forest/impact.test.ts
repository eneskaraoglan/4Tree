import { CO2_KG_PER_TREE_PER_YEAR, estimateCo2Kg } from './impact';

describe('estimateCo2Kg', () => {
  it('ağaç başına yıllık yaklaşık 22 kg sabitini kullanır', () => {
    expect(CO2_KG_PER_TREE_PER_YEAR).toBe(22);
    expect(estimateCo2Kg(1)).toBe(22);
    expect(estimateCo2Kg(7)).toBe(154);
    expect(estimateCo2Kg(100)).toBe(2200);
  });

  it('sıfır, negatif ve geçersiz sayıda 0 verir', () => {
    expect(estimateCo2Kg(0)).toBe(0);
    expect(estimateCo2Kg(-3)).toBe(0);
    expect(estimateCo2Kg(Number.NaN)).toBe(0);
    expect(estimateCo2Kg(Infinity)).toBe(0);
  });
});

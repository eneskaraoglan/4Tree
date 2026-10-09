import { fontAssets } from './fonts';

describe('font varlıkları', () => {
  it('tüm font dosyaları tanımlıdır', () => {
    expect(Object.keys(fontAssets)).toHaveLength(5);
    for (const asset of Object.values(fontAssets)) {
      expect(asset).toBeDefined();
    }
  });
});

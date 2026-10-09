import { radius, screenPadding, touch } from './spacing';

describe('boşluk token regresyonu', () => {
  it('DESIGN.md v2 sabitlerini korur', () => {
    expect([screenPadding, touch.cta, radius.sheet]).toEqual([20, 60, 24]);
  });
});

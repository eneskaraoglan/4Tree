import {
  checkAvatarInitial,
  checkProfileName,
  deriveAvatarInitial,
  isAvatarChar,
  upperCaseTr,
  validateProfilePatch,
} from './profileRules';

describe('upperCaseTr', () => {
  it('Türkçe büyük harf: i -> İ, ı -> I, ş -> Ş', () => {
    expect(upperCaseTr('i')).toBe('İ');
    expect(upperCaseTr('ı')).toBe('I');
    expect(upperCaseTr('ş')).toBe('Ş');
    expect(upperCaseTr('ğ')).toBe('Ğ');
    expect(upperCaseTr('e')).toBe('E');
  });

  it('tek harften uzayan dönüşümde (ß -> SS) harfi olduğu gibi bırakır', () => {
    expect(upperCaseTr('ß')).toBe('ß');
  });
});

describe('isAvatarChar', () => {
  it.each(['A', 'z', 'İ', 'ş', 'Ö', '7', 'я', '田', 'ア', '한', 'ع'])('%s harf/rakamdır', (ch) => {
    expect(isAvatarChar(ch)).toBe(true);
  });

  it.each(['', 'AB', '!', ' ', '-', '😀', '𝒜', '𐐀', '​', '\n', '٣'.repeat(2)])('%j reddedilir', (ch) => {
    expect(isAvatarChar(ch)).toBe(false);
  });
});

describe('deriveAvatarInitial', () => {
  it('adın ilk harfini Türkçe büyük harfle verir', () => {
    expect(deriveAvatarInitial('ismail')).toBe('İ');
    expect(deriveAvatarInitial('  ışıl ')).toBe('I');
    expect(deriveAvatarInitial('Elif')).toBe('E');
  });

  it('baştaki harf olmayan karakterleri atlar; hiç harf yoksa boş döner', () => {
    expect(deriveAvatarInitial('🌲 Defne')).toBe('D');
    expect(deriveAvatarInitial('--')).toBe('');
  });
});

describe('checkProfileName', () => {
  it('kırpılmış adı döner', () => {
    expect(checkProfileName('  Ayşe Yılmaz  ')).toEqual({ ok: true, value: 'Ayşe Yılmaz' });
  });

  it('boş ve yalnız boşluk/görünmez karakterden oluşan adı reddeder', () => {
    expect(checkProfileName('')).toEqual({ ok: false, issue: 'blank' });
    expect(checkProfileName('   ')).toEqual({ ok: false, issue: 'blank' });
    expect(checkProfileName('​‌')).toEqual({ ok: false, issue: 'blank' });
  });

  it('uzunluk sınırları kod noktasıyla sayılır: 2 ve 40 geçer, 1 ve 41 geçmez', () => {
    expect(checkProfileName('A')).toEqual({ ok: false, issue: 'short' });
    expect(checkProfileName(' A ')).toEqual({ ok: false, issue: 'short' });
    expect(checkProfileName('Al').ok).toBe(true);
    expect(checkProfileName('ş'.repeat(40)).ok).toBe(true);
    expect(checkProfileName('ş'.repeat(41))).toEqual({ ok: false, issue: 'long' });
    // Astral karakterler (2 UTF-16 birimi) tek kod noktasıdır.
    expect(checkProfileName('𝒜'.repeat(40)).ok).toBe(true);
    expect(checkProfileName('𝒜'.repeat(41))).toEqual({ ok: false, issue: 'long' });
  });

  it('kontrol, yön ve sıfır genişlikli karakterleri reddeder', () => {
    for (const bad of ['Ay​şe', 'Ay\u0000şe', 'Ay\tşe', 'Ay\nşe', 'Ay‮şe', 'Ay­şe', 'Ay﻿şe']) {
      expect(checkProfileName(bad)).toEqual({ ok: false, issue: 'forbidden' });
    }
  });
});

describe('checkAvatarInitial', () => {
  it('tek harfi/rakamı Türkçe büyük harfe çevirir', () => {
    expect(checkAvatarInitial('i')).toEqual({ ok: true, value: 'İ' });
    expect(checkAvatarInitial('ı')).toEqual({ ok: true, value: 'I' });
    expect(checkAvatarInitial('5')).toEqual({ ok: true, value: '5' });
  });

  it('boş, çok karakterli, harf/rakam olmayan değeri reddeder', () => {
    for (const bad of ['', 'ab', '?', ' ', '😀']) expect(checkAvatarInitial(bad).ok).toBe(false);
  });
});

describe('validateProfilePatch', () => {
  it('yalnız verilen alanları normalleştirip döner', () => {
    expect(validateProfilePatch({ name: ' Ayşe ' })).toEqual({ name: 'Ayşe' });
    expect(validateProfilePatch({ avatarInitial: 'i' })).toEqual({ avatarInitial: 'İ' });
    expect(validateProfilePatch({})).toEqual({});
  });

  it('geçersiz giriş ServiceError(invalid) fırlatır', () => {
    for (const patch of [
      { name: '' },
      { name: 'A' },
      { name: 'x'.repeat(41) },
      { name: 'Ay​şe' },
      { avatarInitial: '' },
      { avatarInitial: 'AB' },
      { avatarInitial: '!' },
      { name: 42 as unknown as string },
      { avatarInitial: null as unknown as string },
    ]) {
      expect(() => validateProfilePatch(patch)).toThrow(expect.objectContaining({ name: 'ServiceError', code: 'invalid' }));
    }
  });
});

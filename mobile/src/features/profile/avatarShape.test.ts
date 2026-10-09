import { AVATAR_COLORS, avatarColor, avatarPath } from './avatarShape';

describe('avatarShape', () => {
  it('aynı addan her zaman aynı renk ve biçim üretir', () => {
    expect(avatarColor('Elif')).toBe(avatarColor('Elif'));
    expect(avatarPath('Elif', 88)).toBe(avatarPath('Elif', 88));
    expect(AVATAR_COLORS).toContain(avatarColor('Elif'));
  });

  it('farklı adlar farklı biçim verir ve ad büyük/küçük harf ile boşluktan etkilenmez', () => {
    expect(avatarPath('Elif', 88)).not.toBe(avatarPath('Mert', 88));
    expect(avatarPath(' elif ', 88)).toBe(avatarPath('elif', 88));
  });

  it('kapalı, yumuşak bir yol çizer (düz daire yayı değil)', () => {
    const path = avatarPath('Zeynep', 88);
    expect(path.startsWith('M')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
    expect(path).toContain('Q');
    expect(path).not.toContain('A');
  });
});

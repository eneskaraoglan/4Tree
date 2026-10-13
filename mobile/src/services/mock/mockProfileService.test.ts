import { createMockServices } from './index';

describe('mock ProfileService.updateProfile', () => {
  it('adı ve avatar harfini günceller; güncel profili döner ve sonraki okumada görünür', async () => {
    const { profile } = createMockServices();
    const updated = await profile.updateProfile({ name: '  Ayşe Yılmaz ', avatarInitial: 'i' });

    expect(updated).toMatchObject({ name: 'Ayşe Yılmaz', avatarInitial: 'İ', totalKm: 147.6, totalTrees: 7 });
    expect(await profile.getProfile()).toEqual(updated);
  });

  it('yalnız verilen alan değişir', async () => {
    const { profile } = createMockServices();
    await profile.updateProfile({ avatarInitial: 'z' });
    expect(await profile.getProfile()).toMatchObject({ name: 'Elif', avatarInitial: 'Z' });
    await profile.updateProfile({ name: 'Mert' });
    expect(await profile.getProfile()).toMatchObject({ name: 'Mert', avatarInitial: 'Z' });
  });

  it('boş istek profili değiştirmez', async () => {
    const { profile } = createMockServices();
    const before = await profile.getProfile();
    expect(await profile.updateProfile({})).toEqual(before);
  });

  it('geçersiz giriş ServiceError(invalid) ile reddedilir ve profil değişmez', async () => {
    const { profile } = createMockServices();
    for (const patch of [{ name: 'A' }, { name: '   ' }, { name: 'Ay​şe' }, { avatarInitial: 'AB' }, { avatarInitial: '' }]) {
      await expect(profile.updateProfile(patch)).rejects.toMatchObject({ name: 'ServiceError', code: 'invalid' });
    }
    expect(await profile.getProfile()).toMatchObject({ name: 'Elif', avatarInitial: 'E' });
  });

  it('dönen profil kopyadır: değiştirmek servisin durumunu bozmaz', async () => {
    const { profile } = createMockServices();
    const updated = await profile.updateProfile({ name: 'Mert' });
    updated.name = 'Başkası';
    expect((await profile.getProfile()).name).toBe('Mert');
  });

  it('hata senaryosunda ağ hatası fırlatır', async () => {
    const { profile } = createMockServices({ scenario: 'error' });
    await expect(profile.updateProfile({ name: 'Mert' })).rejects.toMatchObject({ code: 'network' });
  });

  it('her createMockServices çağrısı taze durumla başlar', async () => {
    await createMockServices().profile.updateProfile({ name: 'Mert' });
    expect((await createMockServices().profile.getProfile()).name).toBe('Elif');
  });
});

describe('mock profil joinedAt', () => {
  it('en eski aktivitenin tarihinden gelir (14 aktivitenin ilki)', async () => {
    const s = createMockServices();
    const [profile, activities] = await Promise.all([s.profile.getProfile(), s.activity.getActivities()]);
    const oldest = [...activities].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt))[0];
    expect(profile.joinedAt).toBe(oldest.startedAt);
    expect(profile.joinedAt).toBe('2026-08-23T07:30:00+03:00');
  });

  it('yeni kullanıcıda (aktivite yok) joinedAt yoktur', async () => {
    expect((await createMockServices({ scenario: 'empty' }).profile.getProfile()).joinedAt).toBeUndefined();
  });
});

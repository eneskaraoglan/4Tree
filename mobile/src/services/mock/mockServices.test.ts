import { kmToNextTree, kmToTrees } from '../conversion';
import { ServiceError } from '../errors';
import { getLevelProgress } from '../levels';
import { MAX_ZONES_PER_USER } from '../privacyZoneRules';
import { createMockServices } from './index';
import { services } from '../index';

const round1 = (n: number) => Math.round(n * 10) / 10;

describe('mock servisler', () => {
  it('index.ts tüm servisleri tek noktadan verir', () => {
    expect(Object.keys(services).sort()).toEqual(['activity', 'auth', 'badge', 'feed', 'forest', 'privacy', 'profile']);
  });

  it('tüm metotlar Promise döner', () => {
    const s = createMockServices();
    expect(s.profile.getProfile()).toBeInstanceOf(Promise);
    expect(s.profile.getLevelProgress()).toBeInstanceOf(Promise);
    expect(s.activity.getActivities()).toBeInstanceOf(Promise);
    expect(s.forest.getTrees()).toBeInstanceOf(Promise);
    expect(s.badge.getBadges()).toBeInstanceOf(Promise);
    expect(s.feed.getPosts()).toBeInstanceOf(Promise);
    expect(s.privacy.getSettings()).toBeInstanceOf(Promise);
  });

  describe('profil ve aktiviteler tutarlı', () => {
    it('Elif: 147,6 km, 7 ağaç, 14 gün, 12,4 km kaldı', async () => {
      const profile = await createMockServices().profile.getProfile();
      expect(profile.name).toBe('Elif');
      expect(profile.avatarInitial).toBe('E');
      expect(profile.totalKm).toBe(147.6);
      expect(profile.totalTrees).toBe(kmToTrees(profile.totalKm));
      expect(profile.totalTrees).toBe(7);
      expect(profile.activeDays).toBe(14);
      expect(kmToNextTree(profile.totalKm)).toBe(12.4);
    });

    it('toplam km, ağaç ve aktif gün aktivitelerden çıkar', async () => {
      const s = createMockServices();
      const [profile, activities] = await Promise.all([s.profile.getProfile(), s.activity.getActivities()]);
      expect(round1(activities.reduce((sum, a) => sum + a.distanceKm, 0))).toBe(profile.totalKm);
      expect(activities.reduce((sum, a) => sum + a.treesEarned, 0)).toBe(profile.totalTrees);
      const days = new Set(activities.map((a) => a.startedAt.slice(0, 10)));
      expect(days.size).toBe(profile.activeDays);
    });

    it('seviye profildeki ile uyumlu', async () => {
      const s = createMockServices();
      const [profile, level] = await Promise.all([s.profile.getProfile(), s.profile.getLevelProgress()]);
      expect(level.level).toBe(profile.level);
      expect(level).toEqual(getLevelProgress(profile.totalKm));
      expect(level.progress).toBeGreaterThanOrEqual(0);
      expect(level.progress).toBeLessThanOrEqual(1);
    });

    it('aktiviteler yeniden eskiye sıralı, son 6 kayıt Ekim 2026 koşusu', async () => {
      const activities = await createMockServices().activity.getActivities();
      const times = activities.map((a) => Date.parse(a.startedAt));
      expect([...times].sort((a, b) => b - a)).toEqual(times);
      activities.slice(0, 6).forEach((a) => {
        expect(a.type).toBe('run');
        expect(a.startedAt.startsWith('2026-10')).toBe(true);
      });
    });

    it('aktivite şekli: süre, tempo ve rota geçerli', async () => {
      const activities = await createMockServices().activity.getActivities();
      activities.forEach((a) => {
        expect(['run', 'walk']).toContain(a.type);
        expect(a.distanceKm).toBeGreaterThan(0);
        expect(a.durationSec).toBeCloseTo(a.distanceKm * a.paceSecPerKm, -1);
        expect(a.route.length).toBeGreaterThan(10);
        a.route.forEach((p) => {
          expect(Number.isFinite(p.lat) && Number.isFinite(p.lng)).toBe(true);
        });
      });
      expect(new Set(activities.map((a) => a.id)).size).toBe(activities.length);
    });

    it('Belgrad Ormanı rotaları gerçekçi koordinatta ve birbirinden farklı', async () => {
      const activities = await createMockServices().activity.getActivities();
      const belgrad = activities.filter((a) => a.place === 'Belgrad Ormanı');
      expect(belgrad.length).toBeGreaterThanOrEqual(4);
      belgrad.forEach((a) =>
        a.route.forEach((p) => {
          expect(p.lat).toBeGreaterThan(41.1);
          expect(p.lat).toBeLessThan(41.3);
          expect(p.lng).toBeGreaterThan(28.85);
          expect(p.lng).toBeLessThan(29.1);
        }),
      );
      const signatures = new Set(belgrad.map((a) => JSON.stringify(a.route.slice(0, 5))));
      expect(signatures.size).toBe(belgrad.length);
    });

    it('getActivity id ile bulur, yoksa null', async () => {
      const s = createMockServices();
      const [first] = await s.activity.getActivities();
      expect(await s.activity.getActivity(first.id)).toEqual(first);
      expect(await s.activity.getActivity('yok')).toBeNull();
    });

    it('dönen nesneyi (rota noktaları dahil) değiştirmek sonraki çağrıyı etkilemez', async () => {
      const s = createMockServices();
      const [first] = await s.activity.getActivities();
      const originalLat = first.route[0].lat;
      const originalLength = first.route.length;

      first.route[0].lat = 0;
      first.route.push({ lat: 1, lng: 1 });
      first.distanceKm = 999;

      const [again] = await s.activity.getActivities();
      expect(again.route[0].lat).toBe(originalLat);
      expect(again.route).toHaveLength(originalLength);
      expect(again.distanceKm).not.toBe(999);

      const byId = await s.activity.getActivity(first.id);
      byId!.route[1].lng = 0;
      const byIdAgain = await s.activity.getActivity(first.id);
      expect(byIdAgain!.route[1].lng).not.toBe(0);
      // Tekil ve liste kopyaları aynı nesneleri paylaşmaz.
      expect(byId!.route[2]).not.toBe(byIdAgain!.route[2]);
    });
  });

  describe('orman', () => {
    it('ağaç sayısı profile eşit ve hepsi temsili', async () => {
      const s = createMockServices();
      const [trees, profile] = await Promise.all([s.forest.getTrees(), s.profile.getProfile()]);
      expect(trees).toHaveLength(profile.totalTrees);
      trees.forEach((t) => {
        expect(t.isSample).toBe(true);
        expect(t.certificateNo).toMatch(/^ORNEK-/);
        expect(t.region).toBeTruthy();
      });
      expect(new Set(trees.map((t) => t.id)).size).toBe(trees.length);
      expect(new Set(trees.map((t) => t.certificateNo)).size).toBe(trees.length);
    });
  });

  describe('rozetler', () => {
    it('8-10 rozet, kazanılanların tarihi var, kazanılmayanların yok', async () => {
      const badges = await createMockServices().badge.getBadges();
      expect(badges.length).toBeGreaterThanOrEqual(8);
      expect(badges.length).toBeLessThanOrEqual(10);
      expect(badges.some((b) => b.earned)).toBe(true);
      expect(badges.some((b) => !b.earned)).toBe(true);
      badges.forEach((b) => expect(Boolean(b.earnedAt)).toBe(b.earned));
    });

    it('10 ağaç kahramanı, 7 ağaçla kazanılmamış', async () => {
      const badges = await createMockServices().badge.getBadges();
      expect(badges.find((b) => b.id === 'tree-hero-10')?.earned).toBe(false);
    });

    it('km-100 rozeti, toplamın 100 km\'yi geçtiği aktivitenin gününde kazanılmış', async () => {
      const s = createMockServices();
      const ascending = (await s.activity.getActivities()).reverse();
      let total = 0;
      const crossing = ascending.find((a) => {
        total = round1(total + a.distanceKm);
        return total >= 100;
      })!;
      const badge = (await s.badge.getBadges()).find((b) => b.id === 'km-100')!;
      expect(badge.earned).toBe(true);
      expect(badge.earnedAt!.slice(0, 10)).toBe(crossing.startedAt.slice(0, 10));
      expect(Date.parse(badge.earnedAt!)).toBeGreaterThanOrEqual(Date.parse(crossing.startedAt));
    });

    it('first-tree rozeti, ilk ağacı kazandıran aktivitenin gününde kazanılmış', async () => {
      const s = createMockServices();
      const ascending = (await s.activity.getActivities()).reverse();
      const first = ascending.find((a) => a.treesEarned > 0)!;
      const badge = (await s.badge.getBadges()).find((b) => b.id === 'first-tree')!;
      expect(badge.earnedAt!.slice(0, 10)).toBe(first.startedAt.slice(0, 10));
      expect(Date.parse(badge.earnedAt!)).toBeGreaterThanOrEqual(Date.parse(first.startedAt));
    });
  });

  describe('feed', () => {
    it('8-10 gönderi, yazarlar arkadaşlar, Elif ve arkadaş olmayanlar', async () => {
      const posts = await createMockServices().feed.getPosts();
      expect(posts.length).toBeGreaterThanOrEqual(8);
      expect(posts.length).toBeLessThanOrEqual(10);
      const names = new Set(posts.map((p) => p.author.name));
      ['Mert', 'Zeynep', 'Can', 'Defne', 'Elif', 'Selin', 'Barış', 'Ece'].forEach((n) =>
        expect(names.has(n)).toBe(true),
      );
      const times = posts.map((p) => Date.parse(p.createdAt));
      expect([...times].sort((a, b) => b - a)).toEqual(times);
    });

    describe('scope', () => {
      it('varsayılan ve everyone tüm gönderileri döner', async () => {
        const s = createMockServices();
        const all = await s.feed.getPosts();
        expect(await s.feed.getPosts('everyone')).toEqual(all);
        expect(all.some((p) => !p.isFriend)).toBe(true);
      });

      it('friends yalnız isFriend olanları döner (Elif dahil)', async () => {
        const s = createMockServices();
        const all = await s.feed.getPosts();
        const friends = await s.feed.getPosts('friends');
        expect(friends.length).toBeGreaterThan(0);
        expect(friends.length).toBeLessThan(all.length);
        friends.forEach((p) => expect(p.isFriend).toBe(true));
        expect(friends).toEqual(all.filter((p) => p.isFriend));
        expect(friends.some((p) => p.author.name === 'Elif')).toBe(true);
      });

      it('isFriend yazara göre: arkadaşlar ve Elif true; Selin, Barış, Ece false (2-3 gönderi)', async () => {
        const posts = await createMockServices().feed.getPosts();
        const friendNames = ['Elif', 'Mert', 'Zeynep', 'Can', 'Defne'];
        posts.forEach((p) => expect(p.isFriend).toBe(friendNames.includes(p.author.name)));
        const strangers = posts.filter((p) => !p.isFriend);
        expect(strangers.length).toBeGreaterThanOrEqual(2);
        expect(strangers.length).toBeLessThanOrEqual(3);
        expect(new Set(strangers.map((p) => p.author.name))).toEqual(new Set(['Selin', 'Barış', 'Ece']));
      });

      it('empty senaryoda her iki kapsam boş, error senaryoda reddedilir', async () => {
        const empty = createMockServices({ scenario: 'empty' });
        expect(await empty.feed.getPosts('friends')).toEqual([]);
        expect(await empty.feed.getPosts('everyone')).toEqual([]);
        const broken = createMockServices({ scenario: 'error' });
        await expect(broken.feed.getPosts('friends')).rejects.toBeInstanceOf(ServiceError);
      });

      it('tepkiler kapsamdan bağımsız kalıcıdır', async () => {
        const s = createMockServices();
        await s.feed.setReaction('post-002', 'clap');
        const friends = await s.feed.getPosts('friends');
        expect(friends.find((p) => p.id === 'post-002')!.myReaction).toBe('clap');
      });
    });

    describe('gönderi rotaları', () => {
      const lengthKm = (route: { lat: number; lng: number }[]) => {
        const toRad = (d: number) => (d * Math.PI) / 180;
        let sum = 0;
        for (let i = 1; i < route.length; i++) {
          const a = route[i - 1];
          const b = route[i];
          const h =
            Math.sin(toRad(b.lat - a.lat) / 2) ** 2 +
            Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(toRad(b.lng - a.lng) / 2) ** 2;
          sum += 2 * 6371 * Math.asin(Math.sqrt(h));
        }
        return sum;
      };

      it('her gönderide rota var ve uzunluğu gönderi mesafesiyle uyumlu', async () => {
        const posts = await createMockServices().feed.getPosts();
        posts.forEach((p) => {
          const route = p.activity.route;
          expect(route).toBeDefined();
          expect(route!.length).toBeGreaterThan(10);
          expect(lengthKm(route!)).toBeGreaterThan(p.activity.distanceKm * 0.95);
          expect(lengthKm(route!)).toBeLessThan(p.activity.distanceKm * 1.05);
        });
      });

      it('rota gönderinin yeri civarında', async () => {
        const posts = await createMockServices().feed.getPosts();
        const boxes: Record<string, [number, number, number, number]> = {
          'Belgrad Ormanı': [41.1, 41.3, 28.85, 29.1],
          'Kaz Dağları': [39.6, 39.8, 26.7, 27.0],
          'Ege kıyısı': [38.2, 38.4, 26.2, 26.5],
          Bolu: [40.5, 40.7, 31.1, 31.5],
        };
        posts.forEach((p) => {
          const [latMin, latMax, lngMin, lngMax] = boxes[p.activity.place];
          p.activity.route!.forEach((pt) => {
            expect(pt.lat).toBeGreaterThan(latMin);
            expect(pt.lat).toBeLessThan(latMax);
            expect(pt.lng).toBeGreaterThan(lngMin);
            expect(pt.lng).toBeLessThan(lngMax);
          });
        });
      });

      it('aynı gönderi her çağrıda ve her servis örneğinde aynı rotayı verir', async () => {
        const a = createMockServices();
        const b = createMockServices();
        expect(await a.feed.getPosts()).toEqual(await a.feed.getPosts());
        expect(await a.feed.getPosts()).toEqual(await b.feed.getPosts());
      });

      it('gönderilerin rotaları birbirinden farklı', async () => {
        const posts = await createMockServices().feed.getPosts();
        const signatures = new Set(posts.map((p) => JSON.stringify(p.activity.route!.slice(0, 4))));
        expect(signatures.size).toBe(posts.length);
      });

      it('Elif\'in gönderisi, aynı günkü aktivitesinin rotasıyla aynı', async () => {
        const s = createMockServices();
        const post = (await s.feed.getPosts()).find((p) => p.author.name === 'Elif')!;
        const activity = (await s.activity.getActivities()).find(
          (a) => a.startedAt.slice(0, 10) === post.createdAt.slice(0, 10),
        )!;
        expect(post.activity.route).toEqual(activity.route);
      });

      it('dönen rota derin kopyadır; mutasyon sonraki çağrıyı ve scope sonuçlarını etkilemez', async () => {
        const s = createMockServices();
        const [first] = await s.feed.getPosts();
        const originalLat = first.activity.route![0].lat;
        const originalLength = first.activity.route!.length;
        first.activity.route![0].lat = 0;
        first.activity.route!.push({ lat: 1, lng: 1 });

        const again = (await s.feed.getPosts()).find((p) => p.id === first.id)!;
        expect(again.activity.route![0].lat).toBe(originalLat);
        expect(again.activity.route).toHaveLength(originalLength);

        // setReaction'ın döndürdüğü kopya da paylaşımsız.
        const updated = await s.feed.setReaction(first.id, 'clap');
        updated.activity.route![1].lng = 0;
        const afterReaction = (await s.feed.getPosts()).find((p) => p.id === first.id)!;
        expect(afterReaction.activity.route![1].lng).not.toBe(0);
        expect(afterReaction.activity.route![1]).not.toBe(updated.activity.route![1]);
      });
    });

    it('Elif\'in 7. ağaç gönderisi aktivitesiyle tutarlı', async () => {
      const s = createMockServices();
      const post = (await s.feed.getPosts()).find((p) => p.author.name === 'Elif')!;
      const activity = (await s.activity.getActivities()).find(
        (a) => a.startedAt.slice(0, 10) === post.createdAt.slice(0, 10),
      )!;
      expect(post.treesEarned).toBe(activity.treesEarned);
      expect(post.activity.distanceKm).toBe(activity.distanceKm);
      expect(post.caption).toContain('Yedinci');
      expect((await s.profile.getProfile()).totalTrees).toBe(7);
    });

    it('setReaction güncel gönderiyi döner ve null ile geri alınır', async () => {
      const s = createMockServices();
      const before = (await s.feed.getPosts()).find((p) => p.id === 'post-002')!;
      const on = await s.feed.setReaction('post-002', 'water');
      expect(on.myReaction).toBe('water');
      expect(on.reactionCounts.water).toBe(before.reactionCounts.water! + 1);
      const off = await s.feed.setReaction('post-002', null);
      expect(off.myReaction).toBeNull();
      expect(off.reactionCounts).toEqual(before.reactionCounts);
    });

    it('kişi başına tek tepki: tür değişince eski türün sayısı düşer, yenisininki artar', async () => {
      const s = createMockServices();
      const before = (await s.feed.getPosts()).find((p) => p.id === 'post-002')!;
      await s.feed.setReaction('post-002', 'clap');
      const swapped = await s.feed.setReaction('post-002', 'heart');
      expect(swapped.myReaction).toBe('heart');
      expect(swapped.reactionCounts.clap).toBe(before.reactionCounts.clap);
      expect(swapped.reactionCounts.heart).toBe(before.reactionCounts.heart! + 1);
      // Mert'in gönderisinde kendi tepkisi (tek) alkış: değişince alkış sayısı 1 azalır.
      const mert = (await s.feed.getPosts()).find((p) => p.id === 'post-001')!;
      const moved = await s.feed.setReaction('post-001', 'leaf');
      expect(moved.reactionCounts.clap).toBe(mert.reactionCounts.clap! - 1);
      expect(moved.reactionCounts.leaf).toBe(1);
    });

    it('aynı değeri iki kez göndermek sayıyı iki kez değiştirmez; son tepki sıfıra inince tür silinir', async () => {
      const s = createMockServices();
      const before = (await s.feed.getPosts()).find((p) => p.id === 'post-002')!;
      await s.feed.setReaction('post-002', 'clap');
      const twice = await s.feed.setReaction('post-002', 'clap');
      expect(twice.reactionCounts.clap).toBe(before.reactionCounts.clap! + 1);

      await s.feed.setReaction('post-002', null);
      const off = await s.feed.setReaction('post-002', null);
      expect(off.reactionCounts).toEqual(before.reactionCounts);

      // post-006: önce su, sonra güç; su sayısı geri iner, güç geri alınınca anahtar düşer.
      const solo = await s.feed.setReaction('post-006', 'water');
      await s.feed.setReaction('post-006', 'power');
      const dropped = (await s.feed.getPosts()).find((p) => p.id === 'post-006')!;
      expect(dropped.reactionCounts.water).toBe(solo.reactionCounts.water! - 1);
      const gone = await s.feed.setReaction('post-006', null);
      expect(gone.reactionCounts).not.toHaveProperty('power');
    });

    it('mock tüm tepki türlerini destekler; bilinmeyen tür invalid, bilinmeyen gönderi not_found', async () => {
      const s = createMockServices();
      expect(s.feed.supportedReactions).toEqual(['water', 'clap', 'leaf', 'heart', 'power']);
      await expect(s.feed.setReaction('post-002', 'rocket' as never)).rejects.toMatchObject({ code: 'invalid' });
      await expect(s.feed.setReaction('yok', 'water')).rejects.toMatchObject({ code: 'not_found' });
      await expect(s.feed.setReaction('yok', null)).rejects.toBeInstanceOf(ServiceError);
    });

    it('gecikme/hata sarmalayıcısı supportedReactions alanını bozmaz', async () => {
      const slow = createMockServices({ latencyMs: 1 });
      expect(slow.feed.supportedReactions).toHaveLength(5);
      const broken = createMockServices({ scenario: 'error' });
      expect(broken.feed.supportedReactions).toHaveLength(5);
    });

    it('durum servis örnekleri arasında paylaşılmaz', async () => {
      const a = createMockServices();
      const b = createMockServices();
      await a.feed.setReaction('post-002', 'clap');
      const post = (await b.feed.getPosts()).find((p) => p.id === 'post-002')!;
      expect(post.myReaction).toBeNull();
    });
  });

  describe('gizlilik', () => {
    const valid = { label: 'Spor salonu', lat: 41.14, lng: 29.0, radiusM: 100 };

    it('varsayılan görünürlük ve bölgeler', async () => {
      const settings = await createMockServices().privacy.getSettings();
      expect(['public', 'friends', 'private']).toContain(settings.visibility);
      expect(settings.zones.length).toBeGreaterThan(0);
    });

    it('görünürlük değişir, bölge eklenir ve silinir', async () => {
      const s = createMockServices();
      expect((await s.privacy.setVisibility('private')).visibility).toBe('private');
      const added = await s.privacy.addZone(valid);
      const zone = added.zones.find((z) => z.label === 'Spor salonu')!;
      expect(zone.id).toBeTruthy();
      const removed = await s.privacy.removeZone(zone.id);
      expect(removed.zones.some((z) => z.id === zone.id)).toBe(false);
      expect((await s.privacy.getSettings()).visibility).toBe('private');
    });

    it.each([
      ['boş etiket', { label: '' }],
      ['yalnızca boşluk etiketi', { label: '   ' }],
      ['sıfır genişlikli etiket', { label: '\u200B\u200D' }],
      ['kontrol karakterli etiket', { label: 'Ev\nİş' }],
      ['bidi karakterli etiket', { label: 'Ev\u202E' }],
      ['uzun etiket', { label: 'a'.repeat(25) }],
      ['izinsiz yarıçap', { radiusM: 150 }],
      ['sıfır yarıçap', { radiusM: 0 }],
      ['negatif yarıçap', { radiusM: -50 }],
      ['NaN yarıçap', { radiusM: NaN }],
      ['enlem > 90', { lat: 90.5 }],
      ['enlem < -90', { lat: -91 }],
      ['boylam > 180', { lng: 181 }],
      ['boylam < -180', { lng: -180.1 }],
    ])('geçersiz bölge reddedilir: %s', async (_name, patch) => {
      const s = createMockServices();
      const before = await s.privacy.getSettings();
      await expect(s.privacy.addZone({ ...valid, ...patch })).rejects.toMatchObject({ code: 'invalid' });
      expect(await s.privacy.getSettings()).toEqual(before);
    });

    it('sınır değerleri kabul edilir ve etiket kırpılır', async () => {
      const s = createMockServices();
      const settings = await s.privacy.addZone({ label: '  Ev 2 ', lat: -90, lng: 180, radiusM: 500 });
      expect(settings.zones.at(-1)).toMatchObject({ label: 'Ev 2', lat: -90, lng: 180, radiusM: 500 });
    });

    it('geçersiz görünürlük değeri invalid ile reddedilir, ayar değişmez', async () => {
      const s = createMockServices();
      const before = await s.privacy.getSettings();
      await expect(s.privacy.setVisibility('everyone' as never)).rejects.toMatchObject({ code: 'invalid' });
      expect(await s.privacy.getSettings()).toEqual(before);
    });

    it('bölge sınırı aşılınca reddedilir', async () => {
      const s = createMockServices({ scenario: 'empty' });
      for (let i = 0; i < MAX_ZONES_PER_USER; i++) await s.privacy.addZone({ ...valid, label: `Bölge ${i}` });
      await expect(s.privacy.addZone(valid)).rejects.toMatchObject({ code: 'invalid' });
    });

    it('olmayan bölgeyi silmek hata verir', async () => {
      const s = createMockServices();
      await expect(s.privacy.removeZone('yok')).rejects.toMatchObject({ code: 'not_found' });
    });
  });

  describe('senaryo: empty (yeni kullanıcı)', () => {
    it('0 km, 0 ağaç, aktivite/ağaç/feed yok, hiç rozet kazanılmamış', async () => {
      const s = createMockServices({ scenario: 'empty' });
      const profile = await s.profile.getProfile();
      expect(profile).toMatchObject({ totalKm: 0, totalTrees: 0, activeDays: 0, level: 'seed' });
      expect(await s.profile.getLevelProgress()).toEqual({ level: 'seed', nextLevel: 'sapling', progress: 0 });
      expect(await s.activity.getActivities()).toEqual([]);
      expect(await s.forest.getTrees()).toEqual([]);
      expect(await s.feed.getPosts()).toEqual([]);
      const badges = await s.badge.getBadges();
      expect(badges.length).toBeGreaterThanOrEqual(8);
      badges.forEach((b) => {
        expect(b.earned).toBe(false);
        expect(b.earnedAt).toBeUndefined();
      });
      expect((await s.privacy.getSettings()).zones).toEqual([]);
    });

    it('boş durumda da yazma çağrıları çalışır', async () => {
      const s = createMockServices({ scenario: 'empty' });
      const settings = await s.privacy.addZone({ label: 'Ev', lat: 41, lng: 29, radiusM: 250 });
      expect(settings.zones).toHaveLength(1);
      expect(await s.activity.getActivity('activity-001')).toBeNull();
    });
  });

  describe('senaryo: error', () => {
    it('tüm servislerin tüm çağrıları anlamlı bir Error ile reddedilir', async () => {
      const s = createMockServices({ scenario: 'error' });
      const calls: Promise<unknown>[] = [
        s.profile.getProfile(),
        s.profile.getLevelProgress(),
        s.activity.getActivities(),
        s.activity.getActivity('activity-001'),
        s.forest.getTrees(),
        s.badge.getBadges(),
        s.feed.getPosts(),
        s.feed.setReaction('post-001', 'water'),
        s.privacy.getSettings(),
        s.privacy.setVisibility('public'),
        s.privacy.addZone({ label: 'Ev', lat: 41, lng: 29, radiusM: 100 }),
        s.privacy.removeZone('zone-home'),
      ];
      const results = await Promise.allSettled(calls);
      results.forEach((r) => {
        expect(r.status).toBe('rejected');
        const reason = (r as PromiseRejectedResult).reason;
        expect(reason).toBeInstanceOf(Error);
        expect(reason).toBeInstanceOf(ServiceError);
        expect(reason.code).toBe('network');
        expect(reason.message.length).toBeGreaterThan(10);
      });
    });
  });

  describe('latencyMs', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('varsayılan 0 iken zamanlayıcı kullanmaz', async () => {
      const s = createMockServices();
      await expect(s.profile.getProfile()).resolves.toBeDefined();
    });

    it('çağrı gecikme dolana kadar çözülmez', async () => {
      const s = createMockServices({ latencyMs: 300 });
      let done = false;
      const pending = s.profile.getProfile().then((p) => {
        done = true;
        return p;
      });
      await jest.advanceTimersByTimeAsync(299);
      expect(done).toBe(false);
      await jest.advanceTimersByTimeAsync(1);
      expect(done).toBe(true);
      expect((await pending).name).toBe('Elif');
    });

    it('error senaryosunda hata da gecikmeden sonra gelir', async () => {
      const s = createMockServices({ scenario: 'error', latencyMs: 200 });
      let settled = false;
      const pending = s.feed.getPosts().catch((e: unknown) => {
        settled = true;
        return e;
      });
      await jest.advanceTimersByTimeAsync(199);
      expect(settled).toBe(false);
      await jest.advanceTimersByTimeAsync(1);
      expect(await pending).toBeInstanceOf(ServiceError);
    });
  });

  it('createMockServices her çağrıda taze durum üretir; singleton ondan türer', async () => {
    const a = createMockServices();
    const b = createMockServices();
    await a.privacy.setVisibility('private');
    expect((await b.privacy.getSettings()).visibility).toBe('friends');
    expect(a).not.toBe(b);
    expect((await services.profile.getProfile()).totalTrees).toBe(7);
  });
});

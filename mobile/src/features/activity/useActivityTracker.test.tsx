import { act, renderHook } from '@testing-library/react-native';
import { StrictMode, type ReactNode } from 'react';

import { createFakeLocationSource, sampleAt, T0 } from './testing';
import { SIGNAL_LOST_AFTER_MS, useActivityTracker } from './useActivityTracker';

let clock = T0;
const now = () => clock;

async function advance(ms: number) {
  clock += ms;
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

async function setup(options: { permission?: 'granted' | 'denied'; persist?: jest.Mock; background?: boolean } = {}) {
  const source = createFakeLocationSource(options.permission ?? 'granted');
  source.background = options.background ?? false;
  const hook = await renderHook(() => useActivityTracker({ source, now, persist: options.persist }));
  return { source, ...hook };
}

describe('useActivityTracker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    clock = T0;
  });
  afterEach(() => jest.useRealTimers());

  it('başlangıçta idle, hiçbir şey ölçülmüyor', async () => {
    const { result, source } = await setup();
    expect(result.current.status).toBe('idle');
    expect(result.current.elapsedSec).toBe(0);
    expect(result.current.distanceKm).toBe(0);
    expect(result.current.currentPace).toBeNull();
    expect(result.current.averagePace).toBeNull();
    expect(result.current.gps).toBe('idle');
    expect(source.startCalls).toBe(0);
  });

  it('start: running olur, konum kaynağı açılır, "konum aranıyor" durumundadır', async () => {
    const { result, source } = await setup();
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.status).toBe('running');
    expect(source.startCalls).toBe(1);
    expect(source.isRunning()).toBe(true);
    expect(result.current.gps).toBe('searching');
    expect(result.current.error).toBeNull();
  });

  it('süre sayacı çalışırken akar, duraklatmada durur, devamda sürer', async () => {
    const { result, source } = await setup();
    await act(async () => {
      await result.current.start();
    });
    await advance(5000);
    expect(result.current.elapsedSec).toBe(5);

    await act(async () => {
      result.current.pause();
    });
    expect(result.current.status).toBe('paused');
    expect(source.isRunning()).toBe(false);
    expect(source.stopCalls).toBe(1);
    await advance(30_000);
    expect(result.current.elapsedSec).toBe(5);

    await act(async () => {
      await result.current.resume();
    });
    expect(result.current.status).toBe('running');
    expect(source.startCalls).toBe(2);
    await advance(3000);
    expect(result.current.elapsedSec).toBe(8);
  });

  it('ölçümlerden mesafe, rota, anlık ve ortalama tempo çıkarır', async () => {
    const { result, source } = await setup();
    await act(async () => {
      await result.current.start();
    });
    // 3 m/sn, 40 sn: 120 m.
    for (let i = 1; i <= 40; i++) {
      await advance(1000);
      await act(async () => source.emit(sampleAt(i, (i - 1) * 3)));
    }
    expect(result.current.gps).toBe('good');
    expect(result.current.distanceKm).toBeCloseTo(0.117, 2);
    // 3 m/sn'de ölçümlerin yaklaşık yarısı 3 m çapa eşiğini geçer; rota seyrelir ama kopmaz.
    expect(result.current.route.length).toBeGreaterThan(15);
    expect(result.current.currentPace).toBeCloseTo(1000 / 3, 0);
    expect(result.current.averagePace).not.toBeNull();
    // Ortalama = 40 sn / ~0,115 km ≈ 347 sn/km (5:47 civarı; çapa adımı yüzünden son 1-3 m henüz sayılmadı).
    expect(result.current.averagePace!).toBeGreaterThan(330);
    expect(result.current.averagePace!).toBeLessThan(365);
  });

  it('durunca anlık tempo gösterilmez, sinyal kesilince "lost" olur', async () => {
    const { result, source } = await setup();
    await act(async () => {
      await result.current.start();
    });
    for (let i = 1; i <= 20; i++) {
      await advance(1000);
      await act(async () => source.emit(sampleAt(i, (i - 1) * 3)));
    }
    expect(result.current.currentPace).not.toBeNull();
    await advance(11_000);
    expect(result.current.currentPace).toBeNull();
    await advance(SIGNAL_LOST_AFTER_MS);
    expect(result.current.gps).toBe('lost');
  });

  it('zayıf sinyal: doğruluk > 50 m ölçümler elenir ve durum "weak" olur', async () => {
    const { result, source } = await setup();
    await act(async () => {
      await result.current.start();
    });
    await advance(1000);
    await act(async () => source.emit(sampleAt(1, 0, { accuracyM: 120 })));
    expect(result.current.gps).toBe('weak');
    expect(result.current.route).toHaveLength(0);
    await advance(1000);
    await act(async () => source.emit(sampleAt(2, 0, { accuracyM: 6 })));
    expect(result.current.gps).toBe('good');
    expect(result.current.route).toHaveLength(1);
  });

  it('kaynaktan hata gelirse "unavailable" hatası verir, aktivite sürer', async () => {
    const { result, source } = await setup();
    await act(async () => {
      await result.current.start();
    });
    await act(async () => source.fail('servis kapalı'));
    expect(result.current.error).toBe('unavailable');
    expect(result.current.status).toBe('running');
  });

  it('izin yoksa başlamaz: idle kalır ve "permission" hatası verir', async () => {
    const { result, source } = await setup({ permission: 'denied' });
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBe('permission');
    expect(source.startCalls).toBe(0);
  });

  it('bitir: finished olur, kaynak kapanır, kaydedilebilir sonuç verir', async () => {
    const { result, source } = await setup();
    await act(async () => {
      await result.current.start();
    });
    for (let i = 1; i <= 20; i++) {
      await advance(1000);
      await act(async () => source.emit(sampleAt(i, (i - 1) * 3)));
    }
    await act(async () => {
      result.current.finish();
    });
    expect(result.current.status).toBe('finished');
    expect(source.isRunning()).toBe(false);
    expect(result.current.result).toMatchObject({ durationSec: 20 });
    expect(result.current.result!.distanceKm).toBeCloseTo(0.057, 2);
    expect(result.current.result!.route.length).toBeGreaterThanOrEqual(10);
    // Bittikten sonra gelen ölçümler yok sayılır.
    await act(async () => source.emit(sampleAt(30, 500)));
    expect(result.current.distanceKm).toBeCloseTo(0.057, 2);
  });

  it('arka plan takibi başladıysa bunu bildirir; duraklatınca düşer', async () => {
    const { result } = await setup({ background: true });
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.background).toBe(true);
    await act(async () => {
      result.current.pause();
    });
    expect(result.current.background).toBe(false);
  });

  it('taslağı periyodik yazar, duraklatınca hemen yazar; değişiklik yoksa tekrar yazmaz', async () => {
    const persist = jest.fn();
    const { result, source } = await setup({ persist });
    await act(async () => {
      await result.current.start();
    });
    for (let i = 1; i <= 12; i++) {
      await advance(1000);
      await act(async () => source.emit(sampleAt(i, (i - 1) * 4)));
    }
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist.mock.calls[0][0]).toMatchObject({ v: 1, startedAt: T0 });
    expect(persist.mock.calls[0][0].points.length).toBeGreaterThan(3);

    // Son periyotta yazılmayan noktalar bir sonraki yazımda gider; ondan sonra yeni nokta yoksa tekrar yazılmaz.
    await advance(10_000);
    expect(persist).toHaveBeenCalledTimes(2);
    await advance(30_000);
    expect(persist).toHaveBeenCalledTimes(2);

    await act(async () => {
      result.current.pause();
    });
    expect(persist).toHaveBeenCalledTimes(3);
  });

  it('mesafe yokken (hareketsiz) taslak yazılmaz', async () => {
    const persist = jest.fn();
    const { result } = await setup({ persist });
    await act(async () => {
      await result.current.start();
    });
    await advance(30_000);
    expect(persist).not.toHaveBeenCalled();
  });

  it('restore: taslağı duraklatılmış açar, devam edilebilir', async () => {
    const { result, source } = await setup();
    await act(async () =>
      result.current.restore({
        v: 1,
        startedAt: T0 - 600_000,
        activeMs: 300_000,
        distanceM: 1000,
        segment: 0,
        points: [
          { lat: 41, lng: 29, t: T0 - 600_000, seg: 0 },
          { lat: 41.009, lng: 29, t: T0 - 300_000, seg: 0 },
        ],
        savedAt: T0 - 300_000,
      }),
    );
    expect(result.current.status).toBe('paused');
    expect(result.current.elapsedSec).toBe(300);
    expect(result.current.distanceKm).toBeCloseTo(1, 2);
    await act(async () => {
      await result.current.resume();
    });
    expect(result.current.status).toBe('running');
    expect(source.startCalls).toBe(1);
    await advance(2000);
    expect(result.current.elapsedSec).toBe(302);
  });

  it('bileşen kapanınca konum kaynağı durdurulur', async () => {
    const { result, source, unmount } = await setup();
    await act(async () => {
      await result.current.start();
    });
    await unmount();
    expect(source.isRunning()).toBe(false);
    expect(source.stopCalls).toBe(1);
  });

  describe('yarışlar', () => {
    /** start çağrısı kaynak çözülene dek bekler. */
    async function setupHeld() {
      const env = await setup();
      env.source.holdStart = true;
      return env;
    }

    it('çift start tek oturum açar', async () => {
      const { result, source } = await setup();
      await act(async () => {
        await Promise.all([result.current.start(), result.current.start()]);
      });
      expect(source.startCalls).toBe(1);
      expect(source.activeCount()).toBe(1);
    });

    it('çift resume tek oturum açar, sızıntı yok', async () => {
      const { result, source } = await setup();
      await act(async () => {
        await result.current.start();
      });
      await act(async () => {
        result.current.pause();
      });
      expect(source.activeCount()).toBe(0);
      await act(async () => {
        await Promise.all([result.current.resume(), result.current.resume()]);
      });
      expect(source.startCalls).toBe(2);
      expect(source.activeCount()).toBe(1);
      expect(result.current.status).toBe('running');
    });

    it('start çözülmeden pause: açılan takip hemen durdurulur', async () => {
      const { result, source } = await setupHeld();
      let started: Promise<void> = Promise.resolve();
      await act(async () => {
        started = result.current.start();
      });
      await act(async () => {
        result.current.pause();
      });
      await act(async () => {
        source.releaseStart();
        await started;
      });
      expect(result.current.status).toBe('paused');
      expect(source.startCalls).toBe(1);
      expect(source.activeCount()).toBe(0);
    });

    it('start çözülmeden bitir: açılan takip hemen durdurulur', async () => {
      const { result, source } = await setupHeld();
      let started: Promise<void> = Promise.resolve();
      await act(async () => {
        started = result.current.start();
      });
      await act(async () => {
        result.current.finish();
      });
      await act(async () => {
        source.releaseStart();
        await started;
      });
      expect(result.current.status).toBe('finished');
      expect(source.activeCount()).toBe(0);
    });

    it('start çözülmeden ekran kapanırsa takip sızmaz', async () => {
      const { result, source, unmount } = await setupHeld();
      let started: Promise<void> = Promise.resolve();
      await act(async () => {
        started = result.current.start();
      });
      await unmount();
      await act(async () => {
        source.releaseStart();
        await started;
      });
      expect(source.activeCount()).toBe(0);
    });

    it('pause -> resume hızlı art arda: eski oturum kapanır, tek yeni oturum kalır', async () => {
      const { result, source } = await setupHeld();
      let started: Promise<void> = Promise.resolve();
      await act(async () => {
        started = result.current.start();
      });
      await act(async () => {
        result.current.pause();
      });
      let resumed: Promise<void> = Promise.resolve();
      await act(async () => {
        resumed = result.current.resume();
      });
      await act(async () => {
        // İlk start çözülür; sonraki start'lar beklemeden geçer.
        source.holdStart = false;
        source.releaseStart();
        await Promise.all([started, resumed]);
      });
      expect(result.current.status).toBe('running');
      expect(source.activeCount()).toBe(1);
    });

    it('durdurulmuş oturumun geç gelen ölçümü yok sayılır', async () => {
      const { result, source } = await setup();
      await act(async () => {
        await result.current.start();
      });
      await advance(1000);
      await act(async () => source.emit(sampleAt(1, 0)));
      expect(result.current.route).toHaveLength(1);
      await act(async () => {
        result.current.pause();
      });
      // Oturum kapandı; eski dinleyiciye gelen ölçüm kabul edilmez.
      expect(source.activeCount()).toBe(0);
      await act(async () => source.emit(sampleAt(2, 50)));
      expect(result.current.route).toHaveLength(1);
    });

    it('Strict Mode (çift effect): start tek kez çalışır ve takip açık kalır', async () => {
      const source = createFakeLocationSource('granted');
      
      const hook = await renderHook(() => useActivityTracker({ source, now }), {
        wrapper: ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>,
      });
      await act(async () => {
        await hook.result.current.start();
      });
      // Sahte unmount'un kapatma işi sıradaydı; bileşen hâlâ bağlı olduğu için takibi kapatmamalı.
      await act(async () => {
        await Promise.resolve();
      });
      expect(hook.result.current.status).toBe('running');
      expect(source.activeCount()).toBe(1);
    });
  });

  describe('resume sırasında izin kaybı', () => {
    it('izin geri alındıysa duraklatılmış kalır, süre akmaz ve "permission" hatası verir', async () => {
      const { result, source } = await setup();
      await act(async () => {
        await result.current.start();
      });
      await advance(5000);
      await act(async () => {
        result.current.pause();
      });
      source.permission = 'blocked';

      await act(async () => {
        await result.current.resume();
      });
      expect(result.current.status).toBe('paused');
      expect(result.current.error).toBe('permission');
      expect(source.activeCount()).toBe(0);
      await advance(30_000);
      expect(result.current.elapsedSec).toBe(5);
    });

    it('izin geri verilince Devam et çalışır ve hata temizlenir', async () => {
      const { result, source } = await setup();
      await act(async () => {
        await result.current.start();
      });
      await act(async () => {
        result.current.pause();
      });
      source.permission = 'denied';
      await act(async () => {
        await result.current.resume();
      });
      expect(result.current.error).toBe('permission');

      source.permission = 'granted';
      await act(async () => {
        await result.current.resume();
      });
      expect(result.current.status).toBe('running');
      expect(result.current.error).toBeNull();
      expect(source.activeCount()).toBe(1);
    });
  });
});

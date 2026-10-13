/* eslint-disable @typescript-eslint/no-require-imports -- modüller her testte taze yüklenir (jest.isolateModules) */
import type { LocationSource } from './LocationSource';
import type { LocationSample } from './types';

type TaskExecutor = (body: { data?: unknown; error: unknown }) => Promise<void> | void;

const location = (lat: number, lng: number, timestamp: number, accuracy: number | null = 8, speed: number | null = 2.5) => ({
  coords: { latitude: lat, longitude: lng, accuracy, speed, altitude: null, altitudeAccuracy: null, heading: null },
  timestamp,
});

function load(options: { expoGo?: boolean; backgroundAvailable?: boolean; startFails?: boolean; orphanStarted?: boolean } = {}) {
  const watchRemovers: jest.Mock[] = [];
  let watchCallback: ((l: ReturnType<typeof location>) => void) | null = null;
  const locationMock = {
    Accuracy: { BestForNavigation: 6 },
    ActivityType: { Fitness: 3 },
    PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
    getForegroundPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted', canAskAgain: true })),
    requestForegroundPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted', canAskAgain: true })),
    watchPositionAsync: jest.fn(async (_options: unknown, callback: typeof watchCallback) => {
      watchCallback = callback;
      const remove = jest.fn();
      watchRemovers.push(remove);
      return { remove };
    }),
    isBackgroundLocationAvailableAsync: jest.fn(async () => options.backgroundAvailable ?? true),
    hasStartedLocationUpdatesAsync: jest.fn(async () => options.orphanStarted ?? false),
    startLocationUpdatesAsync: jest.fn(async () => {
      if (options.startFails) throw new Error('arka plan başlamadı');
    }),
    stopLocationUpdatesAsync: jest.fn(async () => {}),
  };
  let executor: TaskExecutor | null = null;
  const taskMock = {
    defineTask: jest.fn((_name: string, fn: TaskExecutor) => {
      executor = fn;
    }),
  };

  let source!: LocationSource;
  let exports!: typeof import('./expoLocationSource');
  let background!: typeof import('./backgroundTask');
  jest.isolateModules(() => {
    jest.doMock('expo-location', () => locationMock);
    jest.doMock('expo-task-manager', () => taskMock);
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: { executionEnvironment: options.expoGo ? 'storeClient' : 'bare' },
      ExecutionEnvironment: { StoreClient: 'storeClient', Bare: 'bare' },
    }));
    exports = require('./expoLocationSource');
    background = require('./backgroundTask');
    source = exports.createExpoLocationSource();
  });
  return {
    source,
    exports,
    background,
    locationMock,
    watchRemovers,
    emitWatch: (l: ReturnType<typeof location>) => watchCallback?.(l),
    emitTask: (locations: ReturnType<typeof location>[]) => executor?.({ data: { locations }, error: null }),
    executor: () => executor,
  };
}

function collect() {
  const samples: LocationSample[] = [];
  return { samples, handlers: { onSample: (s: LocationSample) => samples.push(s), onError: jest.fn() } };
}

describe('toPermission', () => {
  const { exports } = load();
  it('expo yanıtını uygulama izin durumuna çevirir', () => {
    expect(exports.toPermission({ granted: true, status: 'granted' as never, canAskAgain: true })).toBe('granted');
    expect(exports.toPermission({ granted: false, status: 'undetermined' as never, canAskAgain: true })).toBe('undetermined');
    expect(exports.toPermission({ granted: false, status: 'denied' as never, canAskAgain: true })).toBe('denied');
    expect(exports.toPermission({ granted: false, status: 'denied' as never, canAskAgain: false })).toBe('blocked');
  });

  it('getPermission ve requestPermission aynı çeviriyi kullanır', async () => {
    const env = load();
    env.locationMock.getForegroundPermissionsAsync.mockResolvedValueOnce({ granted: false, status: 'denied', canAskAgain: false });
    expect(await env.source.getPermission()).toBe('blocked');
    env.locationMock.requestForegroundPermissionsAsync.mockResolvedValueOnce({ granted: false, status: 'denied', canAskAgain: true });
    expect(await env.source.requestPermission()).toBe('denied');
  });
});

describe('backgroundTask.toSample', () => {
  it('expo konumunu ölçüme çevirir; eksik doğruluk ve hız null olur', () => {
    const { toSample } = load().background;
    expect(toSample(location(41, 29, 123, 7, 3) as never)).toEqual({ lat: 41, lng: 29, timestamp: 123, accuracyM: 7, speedMs: 3 });
    const loose = location(41, 29, 123);
    (loose.coords as { accuracy: number | null; speed: number | null }).accuracy = null;
    (loose.coords as { accuracy: number | null; speed: number | null }).speed = null;
    expect(toSample(loose as never)).toMatchObject({ accuracyM: null, speedMs: null });
  });
});

describe('createExpoLocationSource', () => {
  it('izin yoksa LocationPermissionError fırlatır', async () => {
    const env = load();
    env.locationMock.getForegroundPermissionsAsync.mockResolvedValueOnce({ granted: false, status: 'denied', canAskAgain: true });
    await expect(env.source.start(collect().handlers)).rejects.toMatchObject({ name: 'LocationPermissionError' });
    expect(env.locationMock.startLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('arka plan görevi başlarsa TEK kaynak odur: ön plan watch açılmaz, ölçümler görevden gelir', async () => {
    const env = load();
    const { samples, handlers } = collect();
    const tracking = await env.source.start(handlers);

    expect(tracking.background).toBe(true);
    expect(env.locationMock.watchPositionAsync).not.toHaveBeenCalled();
    const [taskName, options] = env.locationMock.startLocationUpdatesAsync.mock.calls[0] as unknown as [string, Record<string, any>];
    expect(taskName).toBe('fourtree-activity-location');
    expect(options.foregroundService.notificationTitle).toBe('Aktiviten kaydediliyor');
    expect(options.foregroundService.notificationBody).toBe('Rotan ve mesafen kaydediliyor.');
    expect(options.showsBackgroundLocationIndicator).toBe(true);

    await env.emitTask([location(41, 29, 1000), location(41.0001, 29, 2000)]);
    expect(samples.map((s) => s.timestamp)).toEqual([1000, 2000]);
  });

  it('arka plan başlamazsa ön plan watch\'a düşer (tek kaynak yine geçerli)', async () => {
    const env = load({ startFails: true });
    const { samples, handlers } = collect();
    const tracking = await env.source.start(handlers);

    expect(tracking.background).toBe(false);
    expect(env.locationMock.watchPositionAsync).toHaveBeenCalledTimes(1);
    env.emitWatch(location(41, 29, 1000));
    // Görevden gelen ölçüm bu oturuma ulaşmaz (dinleyici kaldırıldı).
    await env.emitTask([location(41, 29, 2000)]);
    expect(samples.map((s) => s.timestamp)).toEqual([1000]);
  });

  it('Expo Go\'da arka plan denenmez, ön plana düşülür', async () => {
    const env = load({ expoGo: true });
    const tracking = await env.source.start(collect().handlers);
    expect(tracking.background).toBe(false);
    expect(env.locationMock.startLocationUpdatesAsync).not.toHaveBeenCalled();
    expect(env.locationMock.watchPositionAsync).toHaveBeenCalledTimes(1);
  });

  it('arka plan desteklenmiyorsa ön plana düşer', async () => {
    const env = load({ backgroundAvailable: false });
    const tracking = await env.source.start(collect().handlers);
    expect(tracking.background).toBe(false);
    expect(env.locationMock.startLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('başlarken yetim görev varsa önce durdurur', async () => {
    const env = load({ orphanStarted: true });
    await env.source.start(collect().handlers);
    expect(env.locationMock.stopLocationUpdatesAsync).toHaveBeenCalledTimes(1);
    expect(env.locationMock.startLocationUpdatesAsync).toHaveBeenCalledTimes(1);
  });

  it('stop: dinleyiciyi kaldırır, görevi durdurur; ikinci stop etkisizdir', async () => {
    const env = load();
    const { samples, handlers } = collect();
    const tracking = await env.source.start(handlers);
    await env.emitTask([location(41, 29, 4000)]);
    expect(samples).toHaveLength(1);
    await tracking.stop();
    await tracking.stop();

    expect(env.locationMock.stopLocationUpdatesAsync).toHaveBeenCalledTimes(1);
    await env.emitTask([location(41, 29, 5000)]);
    expect(samples).toHaveLength(1);
  });

  it('ön plan takibinde stop watch aboneliğini kaldırır', async () => {
    const env = load({ startFails: true });
    const tracking = await env.source.start(collect().handlers);
    await tracking.stop();
    expect(env.watchRemovers[0]).toHaveBeenCalledTimes(1);
    expect(env.locationMock.stopLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('eski oturumun geç stop\'u yeni oturumun dinleyicisini ve görevini ezmez', async () => {
    const env = load();
    const first = collect();
    const second = collect();
    const a = await env.source.start(first.handlers);
    const b = await env.source.start(second.handlers);

    await a.stop();
    expect(env.locationMock.stopLocationUpdatesAsync).not.toHaveBeenCalledWith('fourtree-activity-location');
    // Yeni oturum hâlâ ölçüm alıyor, eskisi almıyor.
    await env.emitTask([location(41, 29, 7000)]);
    expect(second.samples.map((s) => s.timestamp)).toEqual([7000]);
    expect(first.samples).toEqual([]);

    await b.stop();
    expect(env.locationMock.stopLocationUpdatesAsync).toHaveBeenCalledTimes(1);
  });

  it('görev hatası ya da boş veri dinleyicilere ulaşmaz', async () => {
    const env = load();
    const { samples, handlers } = collect();
    await env.source.start(handlers);
    await env.emitTask([location(41, 29, 100)]);
    expect(samples).toHaveLength(1);
    await env.executor()?.({ data: undefined, error: { code: 1, message: 'x' } });
    await env.executor()?.({ data: { locations: [] }, error: null });
    expect(samples).toHaveLength(1);
  });
});

describe('stopOrphaned', () => {
  it('canlı oturum yokken yetim görevi durdurur', async () => {
    const env = load({ orphanStarted: true });
    await env.source.stopOrphaned();
    expect(env.locationMock.stopLocationUpdatesAsync).toHaveBeenCalledWith('fourtree-activity-location');
  });

  it('görev yoksa dokunmaz', async () => {
    const env = load({ orphanStarted: false });
    await env.source.stopOrphaned();
    expect(env.locationMock.stopLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('bu oturumda canlı görev varken dokunmaz', async () => {
    const env = load({ orphanStarted: false });
    await env.source.start(collect().handlers);
    env.locationMock.hasStartedLocationUpdatesAsync.mockResolvedValue(true);
    env.locationMock.stopLocationUpdatesAsync.mockClear();
    await env.source.stopOrphaned();
    expect(env.locationMock.stopLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('hata fırlatmaz', async () => {
    const env = load();
    env.locationMock.hasStartedLocationUpdatesAsync.mockRejectedValueOnce(new Error('x'));
    await expect(env.source.stopOrphaned()).resolves.toBeUndefined();
  });
});

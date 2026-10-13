/**
 * Yalnız testler için yardımcılar (uygulama koduna import edilmez, src/app dışında).
 * Sahte konum kaynağı: izin durumunu ve ölçümleri elle sürer.
 */
import type { ReactNode } from 'react';

import { ActivityEnvironmentProvider, createActivityEnvironment, type ActivityEnvironment } from './ActivityEnvironment';
import {
  LocationPermissionError,
  type LocationHandlers,
  type LocationPermission,
  type LocationSource,
} from './LocationSource';
import { createMemoryStorage, type KeyValueStorage } from './storage';
import type { LocationSample } from './types';

export type FakeLocationSource = LocationSource & {
  permission: LocationPermission;
  /** requestPermission'ın döndüreceği değer. */
  nextRequestResult: LocationPermission;
  /** Arka plan görevi başladı mı (start sonucu). */
  background: boolean;
  /** true iken start çağrıları `releaseStart` çağrılana dek çözülmez (yarış testleri). */
  holdStart: boolean;
  startCalls: number;
  stopCalls: number;
  requestCalls: number;
  orphanStops: number;
  emit(sample: LocationSample): void;
  fail(message: string): void;
  /** Açık (durdurulmamış) oturum var mı. */
  isRunning(): boolean;
  /** Açık oturum sayısı (sızıntı testleri). */
  activeCount(): number;
  /** Bekleyen start çağrılarını çözer. */
  releaseStart(): void;
};

export function createFakeLocationSource(initial: LocationPermission = 'granted'): FakeLocationSource {
  const sessions = new Map<number, LocationHandlers>();
  const pending: (() => void)[] = [];
  let nextId = 0;
  const fake: FakeLocationSource = {
    permission: initial,
    nextRequestResult: 'granted',
    background: false,
    holdStart: false,
    startCalls: 0,
    stopCalls: 0,
    requestCalls: 0,
    orphanStops: 0,
    async getPermission() {
      return fake.permission;
    },
    async requestPermission() {
      fake.requestCalls += 1;
      fake.permission = fake.nextRequestResult;
      return fake.permission;
    },
    async start(next) {
      if (fake.permission !== 'granted') throw new LocationPermissionError();
      fake.startCalls += 1;
      if (fake.holdStart) await new Promise<void>((resolve) => pending.push(resolve));
      const id = ++nextId;
      sessions.set(id, next);
      return {
        background: fake.background,
        async stop() {
          if (!sessions.delete(id)) return;
          fake.stopCalls += 1;
        },
      };
    },
    async stopOrphaned() {
      fake.orphanStops += 1;
    },
    emit: (sample) => sessions.forEach((h) => h.onSample(sample)),
    fail: (message) => sessions.forEach((h) => h.onError(message)),
    isRunning: () => sessions.size > 0,
    activeCount: () => sessions.size,
    releaseStart: () => pending.splice(0).forEach((resolve) => resolve()),
  };
  return fake;
}

export function createTestEnvironment(options: { permission?: LocationPermission; storage?: KeyValueStorage } = {}) {
  const locationSource = createFakeLocationSource(options.permission ?? 'granted');
  const storage = options.storage ?? createMemoryStorage();
  const environment = createActivityEnvironment({ locationSource, storage });
  return { environment, locationSource, storage };
}

export function TestEnvironment({ environment, children }: { environment: ActivityEnvironment; children: ReactNode }) {
  return <ActivityEnvironmentProvider environment={environment}>{children}</ActivityEnvironmentProvider>;
}

const BASE = { lat: 41.0, lng: 29.0 };
const METERS_PER_DEG_LAT = 111_320;

/** Doğuya `meters` kadar giden ölçüm; zaman `tSec` saniyede. */
export function sampleAt(tSec: number, meters: number, extra: Partial<LocationSample> = {}): LocationSample {
  const metersPerDegLng = METERS_PER_DEG_LAT * Math.cos((BASE.lat * Math.PI) / 180);
  return {
    lat: BASE.lat,
    lng: BASE.lng + meters / metersPerDegLng,
    timestamp: 1_700_000_000_000 + tSec * 1000,
    accuracyM: 5,
    speedMs: null,
    ...extra,
  };
}

/** `sampleAt(0, …)` anının epoch değeri; testlerde sahte `now` bununla hizalanır. */
export const T0 = 1_700_000_000_000;

import type { LocationObject } from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import type { LocationSample } from './types';

/** Arka plan konum görevinin adı; startLocationUpdatesAsync ile aynı olmalı. */
export const ACTIVITY_LOCATION_TASK = 'fourtree-activity-location';

type Listener = (samples: LocationSample[]) => void;

const listeners = new Set<Listener>();

/**
 * Çalışan takip, arka plan görevinden gelen ölçümleri buradan alır. Dönen fonksiyon YALNIZ bu dinleyiciyi
 * kaldırır; yeni oturumun dinleyicisini eski oturumun temizliği ezemez.
 */
export function addBackgroundLocationListener(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Testler için: kayıtlı dinleyici sayısı. */
export const backgroundListenerCount = (): number => listeners.size;

export function toSample(location: LocationObject): LocationSample {
  const { coords } = location;
  return {
    lat: coords.latitude,
    lng: coords.longitude,
    timestamp: location.timestamp,
    accuracyM: coords.accuracy ?? null,
    speedMs: coords.speed ?? null,
  };
}

type TaskData = { locations?: LocationObject[] } | undefined;

/**
 * TaskManager.defineTask modül düzeyinde çağrılmak zorundadır (uygulama arka planda açılırsa React ağacı yoktur).
 * İMPORT ZİNCİRİ: bu dosya `src/app/(tabs)/index.tsx` ve `src/app/activity.tsx` rotalarından (yan etki importu) ve
 * expoLocationSource'tan import edilir. Rotalar tembel yüklendiği için, uygulama yalnızca arka plan konum olayıyla
 * (headless) açılırsa görev tanımsız kalabilir; en sağlamı kök `_layout.tsx` içinde tek satır yan etki importudur
 * (`import '@/features/activity/backgroundTask'`). Dinleyici yoksa (JS yeni açıldı) ölçümler atılır; kayıt
 * zaten yarım kalan aktivite taslağından kurtarılır.
 */
TaskManager.defineTask<TaskData>(ACTIVITY_LOCATION_TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  const samples = data.locations.map(toSample);
  listeners.forEach((listener) => listener(samples));
});

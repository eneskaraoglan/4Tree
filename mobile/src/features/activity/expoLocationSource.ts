import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Location from 'expo-location';

import { trActivity } from '@/i18n';
import { colors } from '@/theme';

import { ACTIVITY_LOCATION_TASK, addBackgroundLocationListener, toSample } from './backgroundTask';
import {
  LocationPermissionError,
  type LocationHandlers,
  type LocationPermission,
  type LocationSource,
  type LocationTracking,
} from './LocationSource';

/** Ön plan takibi: en fazla 1 sn aralık, 3 m mesafe adımı, yüksek doğruluk (koşu temposunda rota için yeterli). */
const WATCH_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.BestForNavigation,
  timeInterval: 1000,
  distanceInterval: 3,
};

export function toPermission(response: Pick<Location.LocationPermissionResponse, 'granted' | 'status' | 'canAskAgain'>): LocationPermission {
  if (response.granted) return 'granted';
  if (response.status === Location.PermissionStatus.UNDETERMINED) return 'undetermined';
  return response.canAskAgain ? 'denied' : 'blocked';
}

/** Expo Go'da arka plan konum (ön plan servisi / background mode) çalışmaz; development build gerekir. */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Arka plan görevini (kaydın sahibi) hangi oturum başlattı. Eski oturumun `stop`'u, yeni oturum görevi
 * devraldıysa görevi durdurmaz.
 */
let taskOwner: symbol | null = null;

/** Arka plan görevini dener; olmazsa (Expo Go, izin/servis hatası) false döner ve ön plana düşülür. */
async function tryStartBackground(owner: symbol): Promise<boolean> {
  if (isExpoGo) return false;
  try {
    if (!(await Location.isBackgroundLocationAvailableAsync())) return false;
    // Yetim kalmış görev varsa temiz seçeneklerle yeniden başlatmak için önce durdurulur.
    if (await Location.hasStartedLocationUpdatesAsync(ACTIVITY_LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(ACTIVITY_LOCATION_TASK);
    }
    await Location.startLocationUpdatesAsync(ACTIVITY_LOCATION_TASK, {
      ...WATCH_OPTIONS,
      activityType: Location.ActivityType.Fitness,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: trActivity.notification.title,
        notificationBody: trActivity.notification.body,
        notificationColor: colors.primary,
      },
    });
    taskOwner = owner;
    return true;
  } catch {
    return false;
  }
}

/**
 * expo-location uygulaması. TEK KAYNAK: arka plan görevi başlarsa ölçümler yalnız ondan gelir (ön plandayken de);
 * başlamazsa (Expo Go, izin yok) ön plan `watchPositionAsync`'e düşülür. İkisi aynı anda çalışmaz.
 */
export function createExpoLocationSource(): LocationSource {
  return {
    async getPermission() {
      return toPermission(await Location.getForegroundPermissionsAsync());
    },
    async requestPermission() {
      return toPermission(await Location.requestForegroundPermissionsAsync());
    },
    async start({ onSample, onError }: LocationHandlers): Promise<LocationTracking> {
      const current = await Location.getForegroundPermissionsAsync();
      if (!current.granted) throw new LocationPermissionError();

      const owner = Symbol('activity-location-session');
      const removeListener = addBackgroundLocationListener((samples) => samples.forEach(onSample));
      const background = await tryStartBackground(owner);

      let subscription: Location.LocationSubscription | null = null;
      if (!background) {
        removeListener();
        subscription = await Location.watchPositionAsync(
          WATCH_OPTIONS,
          (location) => onSample(toSample(location)),
          (reason) => onError(reason),
        );
      }

      let stopped = false;
      return {
        background,
        async stop() {
          if (stopped) return;
          stopped = true;
          subscription?.remove();
          removeListener();
          if (background && taskOwner === owner) {
            taskOwner = null;
            try {
              await Location.stopLocationUpdatesAsync(ACTIVITY_LOCATION_TASK);
            } catch {
              // Görev zaten durmuş olabilir.
            }
          }
        },
      };
    },
    async stopOrphaned() {
      // Bu JS oturumunda canlı bir görev sahibi varsa dokunma.
      if (taskOwner !== null || isExpoGo) return;
      try {
        if (await Location.hasStartedLocationUpdatesAsync(ACTIVITY_LOCATION_TASK)) {
          await Location.stopLocationUpdatesAsync(ACTIVITY_LOCATION_TASK);
        }
      } catch {
        // Sessizce geç: yetim görev temizliği ekranın işlevi için gerekli değil.
      }
    },
  };
}

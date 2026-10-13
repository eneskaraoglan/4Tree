import { createContext, useContext, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { createActivityDraftStore, type ActivityDraftStore } from './activityDraftStore';
import { createActivityQueue, type ActivityQueue } from './activityQueue';
import { createExpoLocationSource } from './expoLocationSource';
import type { LocationSource } from './LocationSource';
import { createSimulatedLocationSource } from './simulatedLocationSource';
import { createAsyncStorage, createMemoryStorage } from './storage';

/** Aktivite özelliğinin cihaz bağımlılıkları. Ekranlar bunları bilmez; testlerde sahtesi verilir. */
export type ActivityEnvironment = {
  locationSource: LocationSource;
  drafts: ActivityDraftStore;
  queue: ActivityQueue;
};

export function createActivityEnvironment(parts: {
  locationSource: LocationSource;
  storage: Parameters<typeof createActivityDraftStore>[0];
}): ActivityEnvironment {
  return {
    locationSource: parts.locationSource,
    drafts: createActivityDraftStore(parts.storage),
    queue: createActivityQueue(parts.storage),
  };
}

let cached: ActivityEnvironment | null = null;

/**
 * Varsayılan ortam (uygulama boyunca tek örnek): cihazda expo-location + AsyncStorage;
 * web önizlemede ve jest'te sahte konum akışı (GPS web'de güvenilir değildir) ve bellek içi depo.
 */
function getDefaultEnvironment(): ActivityEnvironment {
  if (!cached) {
    const useSimulation = Platform.OS === 'web' || process.env.NODE_ENV === 'test';
    cached = createActivityEnvironment({
      locationSource: useSimulation ? createSimulatedLocationSource() : createExpoLocationSource(),
      storage: process.env.NODE_ENV === 'test' ? createMemoryStorage() : createAsyncStorage(),
    });
  }
  return cached;
}

const ActivityEnvironmentContext = createContext<ActivityEnvironment | null>(null);

export function ActivityEnvironmentProvider({
  environment,
  children,
}: {
  environment: ActivityEnvironment;
  children: ReactNode;
}) {
  return <ActivityEnvironmentContext.Provider value={environment}>{children}</ActivityEnvironmentContext.Provider>;
}

export function useActivityEnvironment(): ActivityEnvironment {
  return useContext(ActivityEnvironmentContext) ?? getDefaultEnvironment();
}

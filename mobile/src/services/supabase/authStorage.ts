import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { createChunkedStorage, type KeyValueBackend } from './chunkedStorage';

/**
 * Arka plan görevleri (koşu kaydı) cihaz kilitliyken de oturumu okuyabilsin diye ilk kilit açılışından sonra erişilir;
 * değer başka cihaza yedekle taşınmaz.
 */
const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

/** iOS Keychain ve Android Keystore tabanlı depo. */
export function createSecureStoreBackend(): KeyValueBackend {
  return {
    getItem: (key) => SecureStore.getItemAsync(key, SECURE_OPTIONS),
    setItem: (key, value) => SecureStore.setItemAsync(key, value, SECURE_OPTIONS),
    removeItem: (key) => SecureStore.deleteItemAsync(key, SECURE_OPTIONS),
  };
}

/**
 * Web deposu: tarayıcı localStorage. Statik dışa aktarmada (sunucu tarafı render) ya da
 * localStorage kapalıyken bellekte tutar, böylece çökmez.
 */
export function createWebBackend(): KeyValueBackend {
  const memory = new Map<string, string>();
  const local = (): Storage | null => {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage;
    } catch {
      return null;
    }
  };
  return {
    getItem: async (key) => local()?.getItem(key) ?? memory.get(key) ?? null,
    setItem: async (key, value) => {
      const store = local();
      if (store) {
        try {
          store.setItem(key, value);
          return;
        } catch {
          // Depo dolu ya da kapalı: bellekte tut.
        }
      }
      memory.set(key, value);
    },
    removeItem: async (key) => {
      memory.delete(key);
      try {
        local()?.removeItem(key);
      } catch {
        // Yok sayılır.
      }
    },
  };
}

/** Supabase istemcisinin oturum deposu: native'de parçalı SecureStore, web'de localStorage. */
export function createAuthStorage(os: string = Platform.OS): KeyValueBackend {
  return os === 'web' ? createWebBackend() : createChunkedStorage(createSecureStoreBackend());
}

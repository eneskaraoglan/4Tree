/** AsyncStorage'ın kullandığımız alt kümesi; testte bellek içi uygulama verilir. */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export function createMemoryStorage(initial: Record<string, string> = {}): KeyValueStorage {
  const map = new Map(Object.entries(initial));
  return {
    getItem: async (key) => map.get(key) ?? null,
    setItem: async (key, value) => {
      map.set(key, value);
    },
    removeItem: async (key) => {
      map.delete(key);
    },
  };
}

/**
 * Cihaz deposu. Modül tembel yüklenir: AsyncStorage yerel modülü jest'te yoktur ve
 * testler `createMemoryStorage` kullanır; yalnız gerçek uygulama burayı çağırır.
 * Not: token/oturum burada tutulmaz (expo-secure-store); bu depo sadece aktivite taslağı ve gönderim kuyruğu içindir.
 */
export function createAsyncStorage(): KeyValueStorage {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const module = require('@react-native-async-storage/async-storage') as { default: KeyValueStorage };
  return module.default;
}

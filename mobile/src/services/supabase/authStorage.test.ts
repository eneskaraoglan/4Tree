import * as SecureStore from 'expo-secure-store';

import { createAuthStorage, createWebBackend } from './authStorage';

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'afterFirstUnlockThisDeviceOnly',
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const secureStore = jest.mocked(SecureStore);

describe('createAuthStorage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('native: büyük oturumu SecureStore anahtar kuralına uygun parçalarla yazar', async () => {
    const storage = createAuthStorage('ios');
    await storage.setItem('sb-proje-auth-token', 'q'.repeat(4000));

    const writes = secureStore.setItemAsync.mock.calls;
    expect(writes.length).toBeGreaterThan(2);
    for (const [key, value, options] of writes) {
      expect(key).toMatch(/^[A-Za-z0-9._-]+$/);
      expect(new TextEncoder().encode(value).length).toBeLessThanOrEqual(1800);
      expect(options).toEqual({ keychainAccessible: 'afterFirstUnlockThisDeviceOnly' });
    }
  });

  it('native: düz metin depoya (AsyncStorage/localStorage) hiç yazmaz', async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const setItem = jest.fn();
    Object.defineProperty(globalThis, 'localStorage', { value: { setItem, getItem: jest.fn(), removeItem: jest.fn() }, configurable: true });
    try {
      await createAuthStorage('android').setItem('sb-token', 'gizli');
      expect(setItem).not.toHaveBeenCalled();
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
      else delete (globalThis as { localStorage?: unknown }).localStorage;
    }
  });
});

describe('createWebBackend', () => {
  it('localStorage yokken (statik render) bellekte çalışır, çökmez', async () => {
    const backend = createWebBackend();
    await backend.setItem('k', 'v');
    expect(await backend.getItem('k')).toBe('v');
    await backend.removeItem('k');
    expect(await backend.getItem('k')).toBeNull();
  });
});

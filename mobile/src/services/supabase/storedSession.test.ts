import { createAuthStorage } from './authStorage';
import { readStoredSessionFromStorage } from './supabaseAuthService';
import { AUTH_STORAGE_KEY } from './supabaseClient';

jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn(), openAuthSessionAsync: jest.fn() }));
jest.mock('expo-linking', () => ({ createURL: jest.fn((path: string) => `fourtree://${path}`) }));
jest.mock('expo-secure-store', () => {
  const data = new Map<string, string>();
  return {
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'x',
    getItemAsync: jest.fn(async (key: string) => data.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => void data.set(key, value)),
    deleteItemAsync: jest.fn(async (key: string) => void data.delete(key)),
  };
});

describe('readStoredSessionFromStorage', () => {
  it('SecureStore\'daki parçalı oturumdan yalnız kullanıcı özetini okur (token dönmez)', async () => {
    const stored = {
      access_token: 'GIZLI-'.repeat(600),
      refresh_token: 'r',
      expires_at: 1,
      user: { id: 'u9', email: 'mert@ornek.com', user_metadata: { full_name: 'Mert Kaya' } },
    };
    await createAuthStorage('ios').setItem(AUTH_STORAGE_KEY, JSON.stringify(stored));

    const session = await readStoredSessionFromStorage();
    expect(session).toEqual({ user: { id: 'u9', email: 'mert@ornek.com', name: 'Mert Kaya' } });
    expect(JSON.stringify(session)).not.toContain('GIZLI');
  });

  it('depo boşsa ya da içerik bozuksa null döner', async () => {
    await createAuthStorage('ios').removeItem(AUTH_STORAGE_KEY);
    expect(await readStoredSessionFromStorage()).toBeNull();
    await createAuthStorage('ios').setItem(AUTH_STORAGE_KEY, '{bozuk');
    expect(await readStoredSessionFromStorage()).toBeNull();
  });
});

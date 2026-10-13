import type { SupabaseClient } from '@supabase/supabase-js';

import { createChunkedStorage, type KeyValueBackend } from './chunkedStorage';
import { AUTH_STORAGE_KEY, createSupabaseClient } from './supabaseClient';

/** Gerçek supabase-js istemcisi + parçalı depo + bellek arka ucu; ağ (fetch) sahte. */
describe('çıkıştan sonra oturum deposu', () => {
  const data = new Map<string, string>();
  const backend: KeyValueBackend = {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => void data.set(key, value),
    removeItem: async (key) => void data.delete(key),
  };
  let client: SupabaseClient;
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    data.clear();
    globalThis.fetch = jest.fn(async () => new Response(null, { status: 204 })) as typeof fetch;
    client = createSupabaseClient({ url: 'https://example.supabase.co', anonKey: 'dummy' }, createChunkedStorage(backend, 200));
  });

  afterEach(async () => {
    await client.auth.stopAutoRefresh();
    globalThis.fetch = realFetch;
  });

  it('signOut oturumu, kullanıcıyı ve code_verifier parçalarını depodan tamamen kaldırır', async () => {
    const storage = createChunkedStorage(backend, 200);
    const session = {
      access_token: 'a'.repeat(700),
      refresh_token: 'r'.repeat(40),
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: 'u1', email: 'elif@ornek.com', user_metadata: { full_name: 'Elif Yıldız' }, app_metadata: {}, aud: 'authenticated', created_at: '2026-01-01' },
    };
    await storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    await storage.setItem(`${AUTH_STORAGE_KEY}-code-verifier`, 'v'.repeat(300));
    expect(data.size).toBeGreaterThan(4);

    const { data: before } = await client.auth.getSession();
    expect(before.session?.user.id).toBe('u1');

    const { error } = await client.auth.signOut({ scope: 'local' });
    expect(error).toBeNull();

    expect([...data.keys()]).toEqual([]);
    expect((await client.auth.getSession()).data.session).toBeNull();
  });
});

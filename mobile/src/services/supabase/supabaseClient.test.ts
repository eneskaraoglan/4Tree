import type { AppStateStatus } from 'react-native';

import { bindAutoRefresh, resolveSupabaseConfig, SupabaseConfigError } from './supabaseClient';

const URL_KEY = 'EXPO_PUBLIC_SUPABASE_URL';
const ANON_KEY = 'EXPO_PUBLIC_SUPABASE_ANON_KEY';

describe('resolveSupabaseConfig', () => {
  it('URL ve anon key varsa döner', () => {
    expect(resolveSupabaseConfig({ url: ' https://x.example ', anonKey: 'anon' })).toEqual({
      url: 'https://x.example',
      anonKey: 'anon',
    });
  });

  it('ikisi de eksikse eksik değişken adlarını söyleyen geliştirici hatası fırlatır', () => {
    expect.assertions(4);
    try {
      resolveSupabaseConfig({});
    } catch (error) {
      expect(error).toBeInstanceOf(SupabaseConfigError);
      expect((error as Error).message).toContain(URL_KEY);
      expect((error as Error).message).toContain(ANON_KEY);
      expect((error as Error).message).toContain('.env');
    }
  });

  it('boş ya da yalnız boşluk olan değeri eksik sayar', () => {
    expect(() => resolveSupabaseConfig({ url: '   ', anonKey: 'anon' })).toThrow(URL_KEY);
    expect(() => resolveSupabaseConfig({ url: 'https://x.example', anonKey: '' })).toThrow(ANON_KEY);
  });
});

describe('supabaseClient modülü', () => {
  const originalEnv = { ...process.env };
  const setEnv = (values: Record<string, string | undefined>) => {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
    jest.dontMock('@supabase/supabase-js');
  });

  it('test ortamında env olmadan da yüklenir; istemci kullanılırsa açık hata verir (ağa çıkmaz)', () => {
    setEnv({ [URL_KEY]: undefined, [ANON_KEY]: undefined });
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { supabase } = require('./supabaseClient') as typeof import('./supabaseClient');
      expect(() => supabase.auth.getSession()).toThrow('Testlerde gerçek Supabase istemcisi yok');
    });
  });

  it('üretimde env eksikse modül yüklenirken SupabaseConfigError fırlatır', () => {
    setEnv({ NODE_ENV: 'production', [URL_KEY]: undefined, [ANON_KEY]: undefined });
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      expect(() => require('./supabaseClient')).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);
    });
  });

  it('üretimde env varsa oturum ayarlarıyla istemci kurar (parçalı depo, otomatik yenileme, URL algılama kapalı)', () => {
    setEnv({ NODE_ENV: 'production', [URL_KEY]: 'https://proje.example', [ANON_KEY]: 'anon-anahtar' });
    const fakeClient = { auth: { startAutoRefresh: jest.fn(), stopAutoRefresh: jest.fn() } };
    const createClient = jest.fn(() => fakeClient);
    jest.doMock('@supabase/supabase-js', () => ({ createClient }));
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { supabase } = require('./supabaseClient') as typeof import('./supabaseClient');
      expect(supabase).toBe(fakeClient);
    });

    expect(createClient).toHaveBeenCalledTimes(1);
    const [url, key, options] = createClient.mock.calls[0] as unknown as [string, string, { auth: Record<string, unknown> }];
    expect(url).toBe('https://proje.example');
    expect(key).toBe('anon-anahtar');
    expect(options.auth).toMatchObject({
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    });
    const storage = options.auth.storage as Record<string, unknown>;
    expect(typeof storage.getItem).toBe('function');
    expect(typeof storage.setItem).toBe('function');
    expect(typeof storage.removeItem).toBe('function');
  });
});

describe('bindAutoRefresh', () => {
  function setup(initial: AppStateStatus) {
    let listener: (state: AppStateStatus) => void = () => {};
    const remove = jest.fn();
    const appState = {
      currentState: initial,
      addEventListener: jest.fn((_type: 'change', fn: (state: AppStateStatus) => void) => {
        listener = fn;
        return { remove };
      }),
    };
    const auth = { startAutoRefresh: jest.fn(), stopAutoRefresh: jest.fn() };
    const client = { auth } as unknown as Parameters<typeof bindAutoRefresh>[0];
    const unbind = bindAutoRefresh(client, appState);
    return { auth, emit: (state: AppStateStatus) => listener(state), unbind, remove };
  }

  it('öndeyken yenilemeyi başlatır, arka plana inince durdurur', () => {
    const { auth, emit } = setup('active');
    expect(auth.startAutoRefresh).toHaveBeenCalledTimes(1);

    emit('background');
    expect(auth.stopAutoRefresh).toHaveBeenCalledTimes(1);

    emit('active');
    expect(auth.startAutoRefresh).toHaveBeenCalledTimes(2);
  });

  it('arka planda açılırsa başlatmaz; dönen fonksiyon dinleyiciyi kaldırır', () => {
    const { auth, unbind, remove } = setup('background');
    expect(auth.startAutoRefresh).not.toHaveBeenCalled();
    unbind();
    expect(remove).toHaveBeenCalled();
  });
});

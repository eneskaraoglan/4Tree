import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, type AppStateStatus } from 'react-native';

import { createAuthStorage } from './authStorage';
import type { KeyValueBackend } from './chunkedStorage';

/** Ortam değişkenleri eksikken fırlatılır; uygulama açılırken görünür, geliştirici mesajıdır. */
export class SupabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupabaseConfigError';
  }
}

/**
 * Oturumun depodaki anahtarı. Açıkça verilir ki çevrimdışı açılışta (token yenilenemezken) kayıtlı oturum
 * okunabilsin; supabase-js'in proje adından türettiği varsayılan ada bağımlı kalınmaz.
 * Değer SecureStore anahtar kuralına uyar (harf, rakam, `.`, `-`, `_`).
 */
export const AUTH_STORAGE_KEY = 'fourtree.auth';

export type SupabaseConfig = { url: string; anonKey: string };

/**
 * URL ve anon key yalnız ortam değişkenlerinden gelir; yedek/varsayılan değer yoktur.
 * Anahtar herkese açık (anon) olandır; service_role asla mobil istemcide kullanılmaz.
 */
export function resolveSupabaseConfig(env: { url?: string; anonKey?: string }): SupabaseConfig {
  const url = env.url?.trim();
  const anonKey = env.anonKey?.trim();
  const missing: string[] = [];
  if (!url) missing.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!anonKey) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  if (!url || !anonKey) {
    throw new SupabaseConfigError(
      `Supabase ayarı eksik: ${missing.join(', ')}. mobile/.env dosyasına ekle (şablon: mobile/.env.example), ` +
        'sonra "npx expo start -c" ile yeniden başlat.',
    );
  }
  return { url, anonKey };
}

/** Oturum yönetimi ayarlarıyla Supabase istemcisi üretir (Supabase React Native rehberi). */
export function createSupabaseClient(config: SupabaseConfig, storage: KeyValueBackend = createAuthStorage()): SupabaseClient {
  return createClient(config.url, config.anonKey, {
    auth: {
      storage,
      storageKey: AUTH_STORAGE_KEY,
      autoRefreshToken: true,
      persistSession: true,
      // Mobilde URL'den oturum okunmaz; OAuth dönüşü servis içinde elle işlenir.
      detectSessionInUrl: false,
      // Kod + doğrulayıcı akışı: token'lar dönüş URL'inde görünmez.
      flowType: 'pkce',
    },
  });
}

type AppStateSource = {
  currentState: AppStateStatus;
  addEventListener(type: 'change', listener: (state: AppStateStatus) => void): { remove(): void };
};

/**
 * Uygulama öndeyken token yenilemeyi çalıştırır, arka plana inince durdurur (rehberdeki AppState bağı).
 * Dönen fonksiyon dinleyiciyi kaldırır.
 */
export function bindAutoRefresh(client: SupabaseClient, appState: AppStateSource = AppState): () => void {
  const apply = (state: AppStateStatus) => {
    if (state === 'active') void client.auth.startAutoRefresh();
    else void client.auth.stopAutoRefresh();
  };
  apply(appState.currentState);
  const subscription = appState.addEventListener('change', apply);
  return () => subscription.remove();
}

/** Test ortamında gerçek istemci kurulmaz: her kullanım açık bir hatayla reddedilir, ağa çıkılmaz. */
function createUnavailableClient(): SupabaseClient {
  const fail = (): never => {
    throw new Error('Testlerde gerçek Supabase istemcisi yok. createMockServices ya da sahte istemci kullan.');
  };
  const handler: ProxyHandler<() => never> = {
    get: (_target, property) => (property === 'then' ? undefined : proxy),
    apply: fail,
  };
  const proxy: unknown = new Proxy(fail, handler);
  return proxy as SupabaseClient;
}

function initSupabase(): SupabaseClient {
  if (process.env.NODE_ENV === 'test') return createUnavailableClient();
  // Expo yalnız doğrudan `process.env.EXPO_PUBLIC_*` yazımını derlemeye gömer; dinamik erişim çalışmaz.
  const config = resolveSupabaseConfig({
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  });
  const client = createSupabaseClient(config);
  bindAutoRefresh(client);
  return client;
}

/** Uygulamanın tek Supabase istemcisi. Ortam değişkenleri eksikse modül yüklenirken hata fırlatır. */
export const supabase: SupabaseClient = initSupabase();

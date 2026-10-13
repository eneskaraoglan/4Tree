import { ServiceError, type ServiceErrorCode } from '../errors';
import { supabase } from './supabaseClient';

/** Kullanıcıya gösterilen genel metinler; Supabase/Postgres iç mesajları ASLA buraya taşınmaz. */
const MESSAGES: Record<ServiceErrorCode, string> = {
  network: 'Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.',
  not_found: 'Aradığın kayıt bulunamadı.',
  invalid: 'Girilen bilgiler geçersiz.',
  unauthenticated: 'Oturum bulunamadı. Lütfen tekrar giriş yap.',
};

export function serviceError(code: ServiceErrorCode, message?: string): ServiceError {
  return new ServiceError(code, message ?? MESSAGES[code]);
}

type RawError = { code?: unknown; status?: unknown; message?: unknown; details?: unknown };

export type ErrorOptions = {
  /** Biçimi bozuk kimlik (uuid değil) "bulunamadı" sayılır; kullanıcı girdisi olmayan kimlikler için. */
  badIdIsNotFound?: boolean;
};

/** Yalnız geliştirmede: bilinmeyen hata ayrıntısı konsola yazılır, kullanıcıya ASLA gösterilmez. */
function logUnknown(raw: RawError, error: unknown): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn('[supabase] bilinmeyen hata, network sayıldı:', {
      code: raw.code,
      status: raw.status,
      message: raw.message ?? String(error),
      details: raw.details,
    });
  }
}

/**
 * Supabase/PostgREST/Postgres hatasını ServiceError'a çevirir.
 * Orijinal hata mesajı kullanıcıya SIZDIRILMAZ; yalnız kod ve genel Türkçe metin kalır.
 */
export function toServiceError(error: unknown, options: ErrorOptions = {}): ServiceError {
  if (error instanceof ServiceError) return error;
  const raw: RawError = typeof error === 'object' && error !== null ? (error as RawError) : {};
  const code = typeof raw.code === 'string' ? raw.code : '';

  // Yalnız gerçek kimlik doğrulama sorunları: HTTP 401, süresi dolmuş/eksik JWT.
  if (raw.status === 401 || code === 'PGRST301' || code === 'PGRST302') {
    return serviceError('unauthenticated');
  }
  // PGRST116: tek satır beklenirken 0 satır geldi. 23503: yabancı anahtar (hedef kayıt yok).
  if (code === 'PGRST116' || code === '23503') return serviceError('not_found');
  if (code === '22P02' && options.badIdIsNotFound) return serviceError('not_found');
  // 42501: RLS/izin reddi. Oturum var ama işlem bu kullanıcıya kapalı: giriş sorunu değil.
  // 22xxx veri biçimi, 23xxx bütünlük kısıtı, P0001 sunucu tarafı doğrulama (anti-cheat vb.).
  if (code === '42501' || code.startsWith('22') || code.startsWith('23') || code === 'P0001') {
    return serviceError('invalid');
  }
  logUnknown(raw, error);
  return serviceError('network');
}

/** Supabase yanıtındaki `error` doluysa ServiceError fırlatır. */
export function throwIfError(error: unknown, options?: ErrorOptions): void {
  if (error) throw toServiceError(error, options);
}

/** İstemci/ağ istisnalarını ServiceError'a çevirir; ServiceError olduğu gibi geçer. */
export async function guard<T>(run: () => Promise<T>, options?: ErrorOptions): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw toServiceError(error, options);
  }
}

/**
 * Giriş yapmış kullanıcının kimliği. Ağ çağrısı yapan `getUser()` yerine yerel oturumu
 * (`getSession()`) kullanır; oturum yoksa ServiceError('unauthenticated'),
 * oturum okunamazsa (depolama/istemci hatası) ServiceError('network').
 */
export async function requireUserId(): Promise<string> {
  let result: Awaited<ReturnType<typeof supabase.auth.getSession>>;
  try {
    result = await supabase.auth.getSession();
  } catch (error) {
    // Güvenli depolama / istemci hatası: oturumun yokluğu değil, işlem hatası.
    throw toServiceError(error);
  }
  if (result.error) throw toServiceError(result.error);
  const userId = result.data.session?.user?.id;
  if (!userId) throw serviceError('unauthenticated');
  return userId;
}

/** Süre / km (sn); mesafe 0 ise 0. */
export function computePace(distanceKm: number, durationSec: number): number {
  return distanceKm > 0 ? Math.round(durationSec / distanceKm) : 0;
}

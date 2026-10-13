import { authTr } from '@/i18n/auth';

import { ServiceError } from '../errors';

type ErrorShape = { name?: unknown; code?: unknown; status?: unknown; message?: unknown };

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

/** Aynı sınıf kimliğine bağlı kalmamak için (paket kopyaları, test sahteleri) hata nesnesi alanlarına bakılır. */
function shapeOf(error: unknown): ErrorShape {
  return typeof error === 'object' && error !== null ? (error as ErrorShape) : {};
}

function isNetworkFailure({ name, status, message }: ErrorShape): boolean {
  if (name === 'AuthRetryableFetchError') return true;
  if (typeof status === 'number' && (status === 0 || status >= 500)) return true;
  return /network request failed|failed to fetch|fetch failed|network error|timed? ?out|offline/i.test(text(message));
}

const UNAUTHENTICATED_CODES = new Set([
  'session_not_found',
  'session_expired',
  'refresh_token_not_found',
  'refresh_token_already_used',
  'bad_jwt',
  'no_authorization',
]);

const INVALID_BY_CODE: Record<string, string> = {
  invalid_credentials: authTr.errors.invalidCredentials,
  email_exists: authTr.errors.emailTaken,
  user_already_exists: authTr.errors.emailTaken,
  email_address_invalid: authTr.errors.emailInvalid,
  weak_password: authTr.errors.weakPassword,
  email_not_confirmed: authTr.errors.emailNotConfirmed,
  same_password: authTr.errors.samePassword,
  signup_disabled: authTr.errors.signupDisabled,
  email_provider_disabled: authTr.errors.signupDisabled,
  over_request_rate_limit: authTr.errors.tooManyRequests,
  over_email_send_rate_limit: authTr.errors.tooManyRequests,
};

/** Eski sunucu yanıtlarında kod yok, yalnız mesaj var: bilinen İngilizce kalıplar eşlenir. */
const INVALID_BY_MESSAGE: [RegExp, string][] = [
  [/invalid login credentials/i, authTr.errors.invalidCredentials],
  [/already (been )?registered|already exists/i, authTr.errors.emailTaken],
  [/email not confirmed/i, authTr.errors.emailNotConfirmed],
  [/password should be|weak password/i, authTr.errors.weakPassword],
  [/rate limit|too many/i, authTr.errors.tooManyRequests],
];

/**
 * Supabase/ağ hatasını `ServiceError`'a çevirir. Ham mesaj kullanıcıya sızmaz:
 * bilinen durumlar sabit Türkçe metne, bilinmeyenler `fallbackMessage`'a eşlenir.
 */
export function mapAuthError(error: unknown, fallbackMessage: string = authTr.errors.generic): ServiceError {
  if (error instanceof ServiceError) return error;
  const shape = shapeOf(error);
  const code = text(shape.code);
  const message = text(shape.message);

  if (isNetworkFailure(shape)) return new ServiceError('network', authTr.errors.network);
  if (UNAUTHENTICATED_CODES.has(code) || shape.name === 'AuthSessionMissingError') {
    return new ServiceError('unauthenticated', authTr.errors.unauthenticated);
  }
  if (shape.status === 429) return new ServiceError('invalid', authTr.errors.tooManyRequests);
  if (Object.hasOwn(INVALID_BY_CODE, code)) return new ServiceError('invalid', INVALID_BY_CODE[code]);
  const byMessage = INVALID_BY_MESSAGE.find(([pattern]) => pattern.test(message));
  if (byMessage) return new ServiceError('invalid', byMessage[1]);
  return new ServiceError('invalid', fallbackMessage);
}

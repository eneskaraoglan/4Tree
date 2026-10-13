import { authTr } from '@/i18n/auth';

import { ServiceError } from '../errors';
import { mapAuthError } from './authErrors';

const apiError = (code: string, status: number, message = 'ham ingilizce mesaj') => ({
  name: 'AuthApiError',
  code,
  status,
  message,
});

describe('mapAuthError', () => {
  it('yanlış şifreyi invalid + sabit Türkçe metne çevirir, ham mesajı sızdırmaz', () => {
    const mapped = mapAuthError(apiError('invalid_credentials', 400, 'Invalid login credentials'));
    expect(mapped).toBeInstanceOf(ServiceError);
    expect(mapped.code).toBe('invalid');
    expect(mapped.message).toBe(authTr.errors.invalidCredentials);
    expect(mapped.message).not.toMatch(/Invalid/);
  });

  it.each([
    ['email_exists', authTr.errors.emailTaken],
    ['user_already_exists', authTr.errors.emailTaken],
    ['weak_password', authTr.errors.weakPassword],
    ['email_not_confirmed', authTr.errors.emailNotConfirmed],
    ['over_request_rate_limit', authTr.errors.tooManyRequests],
    ['over_email_send_rate_limit', authTr.errors.tooManyRequests],
    ['email_address_invalid', authTr.errors.emailInvalid],
  ])('%s kodunu eşler', (code, message) => {
    const mapped = mapAuthError(apiError(code, 422));
    expect(mapped.code).toBe('invalid');
    expect(mapped.message).toBe(message);
  });

  it('kodsuz eski yanıtları mesaj kalıbından eşler', () => {
    expect(mapAuthError({ message: 'User already registered', status: 422 }).message).toBe(authTr.errors.emailTaken);
  });

  it('ağ hatalarını network yapar', () => {
    expect(mapAuthError({ name: 'AuthRetryableFetchError', message: 'x', status: 0 }).code).toBe('network');
    expect(mapAuthError(new TypeError('Network request failed')).code).toBe('network');
    expect(mapAuthError(apiError('unexpected_failure', 503)).code).toBe('network');
    expect(mapAuthError(new TypeError('Network request failed')).message).toBe(authTr.errors.network);
  });

  it('oturum yok/süresi doldu durumlarını unauthenticated yapar', () => {
    expect(mapAuthError(apiError('session_not_found', 403)).code).toBe('unauthenticated');
    expect(mapAuthError(apiError('refresh_token_not_found', 400)).code).toBe('unauthenticated');
    expect(mapAuthError({ name: 'AuthSessionMissingError', message: 'Auth session missing!' }).code).toBe(
      'unauthenticated',
    );
  });

  it('bilinmeyen hatayı verilen yedek metne eşler; ServiceError olduğu gibi geçer', () => {
    expect(mapAuthError(apiError('bilinmeyen', 400), authTr.errors.googleFailed).message).toBe(authTr.errors.googleFailed);
    expect(mapAuthError('garip').message).toBe(authTr.errors.generic);
    const own = new ServiceError('invalid', 'özel');
    expect(mapAuthError(own)).toBe(own);
  });
});

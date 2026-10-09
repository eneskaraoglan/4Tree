export type ServiceErrorCode = 'network' | 'not_found' | 'invalid';

/** Servis katmanının fırlattığı hata. `message` kullanıcıya gösterilebilir Türkçe metindir. */
export class ServiceError extends Error {
  readonly code: ServiceErrorCode;

  constructor(code: ServiceErrorCode, message: string) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
  }
}

import { ServiceError } from '../errors';
import { supabase } from './supabaseClient';
import { computePace, guard, requireUserId, toServiceError } from './supabaseHelpers';
import { setupFakeSupabase } from './supabaseTestUtils';

jest.mock('./supabaseClient', () => ({
  supabase: { auth: { getSession: jest.fn(), getUser: jest.fn() }, from: jest.fn() },
}));

const getSession = supabase.auth.getSession as jest.Mock;
const getUser = supabase.auth.getUser as jest.Mock;
const from = supabase.from as jest.Mock;

describe('toServiceError', () => {
  beforeEach(() => {
    setupFakeSupabase(from, getSession);
  });

  it.each([
    [{ code: 'PGRST301' }, 'unauthenticated'],
    [{ code: 'PGRST302' }, 'unauthenticated'],
    [{ status: 401 }, 'unauthenticated'],
    [{ code: 'PGRST116' }, 'not_found'],
    [{ code: '23503' }, 'not_found'],
    [{ code: '42501' }, 'invalid'],
    [{ code: '23505' }, 'invalid'],
    [{ code: '22P02' }, 'invalid'],
    [{ code: 'P0001' }, 'invalid'],
    [{ code: '', message: 'Failed to fetch' }, 'network'],
    [{ code: '57014' }, 'network'],
    [{ status: 500 }, 'network'],
    [new TypeError('Network request failed'), 'network'],
    [null, 'network'],
  ])('%j -> %s', (error, code) => {
    expect(toServiceError(error).code).toBe(code);
  });

  it('biçimi bozuk kimliği isteğe bağlı not_found yapar', () => {
    expect(toServiceError({ code: '22P02' }, { badIdIsNotFound: true }).code).toBe('not_found');
  });

  it('iç hata mesajını sızdırmaz', () => {
    const error = toServiceError({ code: 'P0001', message: 'Anti-Cheat: secret internal detail relation "runs"' });
    expect(error.message).not.toMatch(/Anti-Cheat|runs|secret/);
    expect(error.message).toBe('Girilen bilgiler geçersiz.');
  });

  it('ServiceError değerini olduğu gibi geçirir', () => {
    const original = new ServiceError('not_found', 'x');
    expect(toServiceError(original)).toBe(original);
  });

  it('bilinmeyen hata geliştirmede konsola yazılır ama kullanıcı metnine sızmaz', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = toServiceError({ code: 'XX999', message: 'internal detail', details: 'row 5' });
    expect(error.code).toBe('network');
    expect(error.message).not.toMatch(/XX999|internal|row 5/);
    expect(warn).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ code: 'XX999', message: 'internal detail' }));
  });

  it('bilinen kodlar uyarı üretmez', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    warn.mockClear();
    toServiceError({ code: 'PGRST116' });
    toServiceError({ code: '42501' });
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('guard', () => {
  it('beklenmeyen istisnayı network ServiceError yapar', async () => {
    setupFakeSupabase(from, getSession);
    await expect(guard(async () => { throw new Error('boom'); })).rejects.toMatchObject({ code: 'network' });
  });
});

describe('requireUserId', () => {
  it('yerel oturumdan kimliği döner, ağ çağrılı getUser kullanılmaz', async () => {
    setupFakeSupabase(from, getSession, { userId: 'abc' });
    getUser.mockClear();
    await expect(requireUserId()).resolves.toBe('abc');
    expect(getSession).toHaveBeenCalledTimes(1);
    expect(getUser).not.toHaveBeenCalled();
  });

  it('oturum yoksa unauthenticated', async () => {
    setupFakeSupabase(from, getSession, { userId: null });
    await expect(requireUserId()).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('getSession 401 hatası dönerse unauthenticated', async () => {
    setupFakeSupabase(from, getSession, { sessionError: { status: 401, message: 'jwt expired' } });
    await expect(requireUserId()).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('getSession depolama/istemci hatası dönerse network (oturum yokluğu sayılmaz)', async () => {
    setupFakeSupabase(from, getSession, { sessionError: new Error('storage') });
    await expect(requireUserId()).rejects.toMatchObject({ code: 'network' });
  });

  it('getSession fırlatırsa network', async () => {
    setupFakeSupabase(from, getSession);
    getSession.mockRejectedValue(new Error('SecureStore okunamadı'));
    const error = await requireUserId().catch((e) => e);
    expect(error).toMatchObject({ name: 'ServiceError', code: 'network' });
    expect(error.message).not.toContain('SecureStore');
  });
});

describe('computePace', () => {
  it('süre / km hesaplar, mesafe 0 ise 0 döner', () => {
    expect(computePace(5, 1650)).toBe(330);
    expect(computePace(0, 100)).toBe(0);
  });
});

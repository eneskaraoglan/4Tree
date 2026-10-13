import { authTr, fill } from '@/i18n';

import { PASSWORD_MIN_LENGTH, validateEmail, validateName, validatePassword, visibleError } from './validation';

describe('validation', () => {
  it('ad boş olamaz', () => {
    expect(validateName('  ')).toBe(authTr.validation.nameRequired);
    expect(validateName('Elif')).toBeNull();
  });

  it('e-posta: boş, bozuk ve geçerli', () => {
    expect(validateEmail('')).toBe(authTr.validation.emailRequired);
    expect(validateEmail('elif')).toBe(authTr.validation.emailInvalid);
    expect(validateEmail('elif@ornek')).toBe(authTr.validation.emailInvalid);
    expect(validateEmail('el if@ornek.com')).toBe(authTr.validation.emailInvalid);
    expect(validateEmail(' elif@ornek.com ')).toBeNull();
  });

  it('şifre: girişte yalnız boşluk kontrolü, kayıtta en az 8 karakter', () => {
    expect(validatePassword('', { enforceLength: false })).toBe(authTr.validation.passwordRequired);
    expect(validatePassword('1', { enforceLength: false })).toBeNull();
    expect(validatePassword('1234567', { enforceLength: true })).toBe(
      fill(authTr.validation.passwordShort, { min: PASSWORD_MIN_LENGTH }),
    );
    expect(validatePassword('12345678', { enforceLength: true })).toBeNull();
  });

  it('visibleError: gönderimde hep, aksi halde yalnız dokunulmuş ve dolu alanda', () => {
    expect(visibleError('hata', { submitted: true, touched: false, value: '' })).toBe('hata');
    expect(visibleError('hata', { submitted: false, touched: true, value: 'x' })).toBe('hata');
    expect(visibleError('hata', { submitted: false, touched: true, value: '' })).toBeNull();
    expect(visibleError('hata', { submitted: false, touched: false, value: 'x' })).toBeNull();
    expect(visibleError(null, { submitted: true, touched: true, value: 'x' })).toBeNull();
  });
});

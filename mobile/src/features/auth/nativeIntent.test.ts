import { redirectSystemPath } from '@/app/+native-intent';

import { redirectAuthCallback } from './nativeIntent';

describe('redirectAuthCallback', () => {
  it('Google dönüş adresini ana yola yönlendirir (kod/token rota olmaz)', () => {
    expect(redirectAuthCallback('/auth-callback')).toBe('/');
    expect(redirectAuthCallback('fourtree://auth-callback#access_token=AT&refresh_token=RT')).toBe('/');
    expect(redirectAuthCallback('/auth-callback?code=abc')).toBe('/');
    expect(redirectAuthCallback('exp://192.168.1.4:8081/--/auth-callback?code=abc')).toBe('/');
  });

  it('diğer yollara dokunmaz', () => {
    expect(redirectAuthCallback('/profile')).toBe('/profile');
    expect(redirectAuthCallback('/auth-callback-yok')).toBe('/auth-callback-yok');
  });

  it('+native-intent dosyası bunu kullanır', () => {
    expect(redirectSystemPath({ path: '/auth-callback?code=x', initial: false })).toBe('/');
    expect(redirectSystemPath({ path: '/forest', initial: true })).toBe('/forest');
  });
});

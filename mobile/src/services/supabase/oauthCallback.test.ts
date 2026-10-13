import { matchesRedirect, parseAuthCallback } from './oauthCallback';

describe('parseAuthCallback', () => {
  it('PKCE: sorgudaki code değerini okur', () => {
    expect(parseAuthCallback('fourtree://auth-callback?code=abc123')).toEqual({ kind: 'code', code: 'abc123' });
    expect(parseAuthCallback('exp://192.168.1.4:8081/--/auth-callback?code=abc123')).toEqual({
      kind: 'code',
      code: 'abc123',
    });
  });

  it('doğrudan token taşıyan (örtük akış) adresi kabul etmez: yalnız code geçerlidir', () => {
    expect(parseAuthCallback('fourtree://auth-callback#access_token=AT&refresh_token=RT&expires_in=3600')).toEqual({
      kind: 'empty',
    });
    expect(parseAuthCallback('fourtree://auth-callback?access_token=AT&refresh_token=RT')).toEqual({ kind: 'empty' });
    // Fragment'taki code da sayılmaz; PKCE dönüşü sorgudadır.
    expect(parseAuthCallback('fourtree://auth-callback#code=abc')).toEqual({ kind: 'empty' });
    // Kod varsa token'lar yine yok sayılır.
    expect(parseAuthCallback('fourtree://auth-callback?code=k#access_token=AT&refresh_token=RT')).toEqual({
      kind: 'code',
      code: 'k',
    });
  });

  it('kullanıcı Google izin ekranında reddederse iptal sayar', () => {
    expect(parseAuthCallback('fourtree://auth-callback?error=access_denied&error_description=denied')).toEqual({
      kind: 'cancelled',
    });
    expect(parseAuthCallback('fourtree://auth-callback#error=access_denied')).toEqual({ kind: 'cancelled' });
  });

  it('başka hataları ve boş adresi ayırır', () => {
    expect(parseAuthCallback('fourtree://auth-callback?error=server_error')).toEqual({ kind: 'error' });
    expect(parseAuthCallback('fourtree://auth-callback')).toEqual({ kind: 'empty' });
  });
});

describe('matchesRedirect', () => {
  const redirect = 'fourtree://auth-callback';

  it('aynı şema ve yolu, sorgu/fragment/büyük harf/son eğik çizgi farkına bakmadan eşler', () => {
    expect(matchesRedirect('fourtree://auth-callback?code=1', redirect)).toBe(true);
    expect(matchesRedirect('FourTree://Auth-Callback/#x=1', redirect)).toBe(true);
    expect(matchesRedirect('fourtree:///auth-callback?code=1', redirect)).toBe(true);
    expect(matchesRedirect('exp://10.0.0.2:8081/--/auth-callback?code=1', 'exp://10.0.0.2:8081/--/auth-callback')).toBe(true);
  });

  it('yabancı şema, ana makine ya da yolu reddeder', () => {
    expect(matchesRedirect('https://kotu.example/auth-callback?code=1', redirect)).toBe(false);
    expect(matchesRedirect('baskauygulama://auth-callback?code=1', redirect)).toBe(false);
    expect(matchesRedirect('fourtree://baska-yol?code=1', redirect)).toBe(false);
    expect(matchesRedirect('fourtree://auth-callback.kotu.example?code=1', redirect)).toBe(false);
    expect(matchesRedirect('fourtree://auth-callback/ek?code=1', redirect)).toBe(false);
  });
});

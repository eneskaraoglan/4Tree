/** Uygulamaya dönen bağlantıdan (OAuth ya da e-posta) çıkarılan sonuç. */
export type AuthCallback =
  | { kind: 'code'; code: string }
  | { kind: 'cancelled' }
  | { kind: 'error' }
  | { kind: 'empty' };

function readParams(part: string): URLSearchParams {
  return new URLSearchParams(part);
}

/**
 * `fourtree://auth-callback?code=...` adresini çözer (PKCE akışı). Yalnız sorgudaki `code` kabul edilir:
 * `#access_token=...&refresh_token=...` gibi doğrudan token taşıyan adresler (örtük akış) bilerek yok sayılır;
 * bu istemci PKCE kullanır, token'ı adresten alıp oturum kurmak sahte bir bağlantıyla oturum enjekte etmeye açıktır.
 * Kullanıcı Google izin ekranında reddederse (`access_denied`) 'cancelled' döner.
 * Adres loglanmaz: içinde kod olabilir.
 */
export function parseAuthCallback(url: string): AuthCallback {
  const hashIndex = url.indexOf('#');
  const beforeHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? '' : url.slice(hashIndex + 1);
  const queryIndex = beforeHash.indexOf('?');
  const query = readParams(queryIndex === -1 ? '' : beforeHash.slice(queryIndex + 1));
  const hash = readParams(fragment);

  const error = query.get('error') ?? hash.get('error') ?? query.get('error_code') ?? hash.get('error_code');
  if (error) return error === 'access_denied' ? { kind: 'cancelled' } : { kind: 'error' };

  const code = query.get('code');
  return code ? { kind: 'code', code } : { kind: 'empty' };
}

/** Adresin şema + ana makine + yolu (sorgu ve fragment hariç), karşılaştırma için normalize edilmiş hali. */
function target(url: string): string {
  return url
    .split(/[?#]/)[0]
    .trim()
    .toLowerCase()
    .replace(/^([a-z][a-z0-9+.-]*):\/+/, '$1://')
    .replace(/\/+$/, '');
}

/**
 * Dönen adres, bizim verdiğimiz `redirectTo` ile aynı şema ve yola mı sahip? Değilse (yabancı bir
 * uygulamanın/sitenin adresi) kod ya da hata içerse de işlenmez.
 */
export function matchesRedirect(url: string, redirectTo: string): boolean {
  return target(url) === target(redirectTo);
}

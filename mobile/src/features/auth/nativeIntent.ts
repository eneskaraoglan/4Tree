/**
 * Google dönüş adresi (fourtree://auth-callback#...) servis tarafından işlenir; router bu adrese bir ekran aramasın.
 * Aksi halde Android'de "bulunamadı" ekranı açılır ve adres (kod/token içerebilir) rota olarak yazılır.
 * Başka yola dokunulmaz.
 */
export function redirectAuthCallback(path: string): string {
  return /(^|\/)auth-callback(?=$|[?#/])/.test(path) ? '/' : path;
}

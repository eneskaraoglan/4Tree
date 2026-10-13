import { ServiceError } from './errors';
import { hasForbiddenChar, isBlank } from './privacyZoneRules';

/**
 * Profil düzenleme kuralları: gerçek (Supabase) ve mock servis AYNI doğrulamayı kullanır;
 * arayüz de aynı kontrolle satır içi mesaj üretir (kural tek kaynakta).
 */

/** Ad uzunluğu sınırları (kod noktası, kırpılmış metin). */
export const PROFILE_NAME_MIN_LENGTH = 2;
export const PROFILE_NAME_MAX_LENGTH = 40;

export type ProfileNameIssue = 'blank' | 'short' | 'long' | 'forbidden';

export type ProfilePatch = { name?: string; avatarInitial?: string };

/**
 * Büyük/küçüklüğü olmayan yazı sistemlerinde (CJK, Hangul, Arap, İbrani, Devanagari, Tay) harf aralıkları.
 * Hermes'te \p{L} gibi Unicode özelliklerine güvenilmez; kod noktaları elle denetlenir.
 */
const UNCASED_LETTER_RANGES: readonly (readonly [number, number])[] = [
  [0x05d0, 0x05ea],
  [0x0621, 0x064a],
  [0x0904, 0x0939],
  [0x0e01, 0x0e30],
  [0x3041, 0x30ff],
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xac00, 0xd7a3],
];

/** Türkçe büyük harf: i -> İ, ı -> I; tek harften uzayan dönüşümlerde (ß -> SS) harf olduğu gibi kalır. */
export function upperCaseTr(text: string): string {
  return Array.from(text)
    .map((ch) => {
      if (ch === 'i') return 'İ';
      if (ch === 'ı') return 'I';
      const upper = ch.toUpperCase();
      return Array.from(upper).length === 1 ? upper : ch;
    })
    .join('');
}

/** Tek bir kod noktası: harf (büyük/küçüklü ya da yukarıdaki yazı sistemleri) veya ASCII rakam. */
export function isAvatarChar(ch: string): boolean {
  const points = Array.from(ch);
  if (points.length !== 1) return false;
  // Yalnız BMP: astral karakterler (emoji, matematik harfleri) avatarda güvenle gösterilemez.
  if ((ch.codePointAt(0) as number) > 0xffff) return false;
  if (/^[0-9]$/.test(ch)) return true;
  if (ch.toLowerCase() !== ch.toUpperCase()) return true;
  const code = ch.codePointAt(0) as number;
  return UNCASED_LETTER_RANGES.some(([from, to]) => code >= from && code <= to);
}

/** Adın ilk harfi/rakamı (büyük harf); yoksa boş metin. Varsayılan avatar harfi budur. */
export function deriveAvatarInitial(name: string): string {
  const first = Array.from(name.trim()).find(isAvatarChar);
  return first ? upperCaseTr(first) : '';
}

/** Ad geçerliyse kırpılmış değeri, değilse sorunun türünü döner (arayüz mesajı kendi i18n'inden seçer). */
export function checkProfileName(raw: string): { ok: true; value: string } | { ok: false; issue: ProfileNameIssue } {
  if (isBlank(raw)) return { ok: false, issue: 'blank' };
  const value = raw.trim();
  if (hasForbiddenChar(value)) return { ok: false, issue: 'forbidden' };
  const length = Array.from(value).length;
  if (length < PROFILE_NAME_MIN_LENGTH) return { ok: false, issue: 'short' };
  if (length > PROFILE_NAME_MAX_LENGTH) return { ok: false, issue: 'long' };
  return { ok: true, value };
}

/** Avatar harfi geçerliyse büyük harfe çevrilmiş değeri döner (tek harf ya da rakam). */
export function checkAvatarInitial(raw: string): { ok: true; value: string } | { ok: false } {
  if (!isAvatarChar(raw)) return { ok: false };
  return { ok: true, value: upperCaseTr(raw) };
}

const NAME_MESSAGES: Record<ProfileNameIssue, string> = {
  blank: 'Adını yaz.',
  short: `Ad en az ${PROFILE_NAME_MIN_LENGTH} karakter olmalı.`,
  long: `Ad en fazla ${PROFILE_NAME_MAX_LENGTH} karakter olabilir.`,
  forbidden: 'Adında geçersiz karakter var.',
};

const invalid = (message: string) => new ServiceError('invalid', message);

/**
 * Düzenleme isteğini doğrular; kırpılmış/normalleştirilmiş değerleri döner.
 * Verilmeyen alan sonuçta da yoktur. Geçersiz giriş ServiceError('invalid') ile reddedilir.
 */
export function validateProfilePatch(patch: ProfilePatch): ProfilePatch {
  const result: ProfilePatch = {};
  if (patch.name !== undefined) {
    const name = typeof patch.name === 'string' ? checkProfileName(patch.name) : null;
    if (!name) throw invalid(NAME_MESSAGES.blank);
    if (!name.ok) throw invalid(NAME_MESSAGES[name.issue]);
    result.name = name.value;
  }
  if (patch.avatarInitial !== undefined) {
    const initial = typeof patch.avatarInitial === 'string' ? checkAvatarInitial(patch.avatarInitial) : null;
    if (!initial?.ok) throw invalid('Avatar harfi tek bir harf ya da rakam olmalı.');
    result.avatarInitial = initial.value;
  }
  return result;
}

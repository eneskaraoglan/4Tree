import type { PrivacyZone } from '@/types';

import { ServiceError } from './errors';

/**
 * Gizlilik bölgesi kuralları: gerçek (Supabase) ve mock servis AYNI doğrulamayı kullanır.
 * Arayüz bu sabitleri `features/profile/zoneConfig.ts` üzerinden yeniden dışa aktarır.
 */

/** Seçilebilir gizlilik bölgesi yarıçapları (metre). */
export const ZONE_RADIUS_OPTIONS = [100, 250, 500] as const;
export const DEFAULT_ZONE_RADIUS = 250;
/** Bölge adı için en çok karakter (kod noktası). */
export const ZONE_LABEL_MAX_LENGTH = 24;
/** Kullanıcı başına en çok bölge (istemci sınırı; sunucu tarafı yok, backend notu). */
export const MAX_ZONES_PER_USER = 10;

/** Görünmez/biçim karakterleri: tek tek kod noktaları (sıfır genişlikli, yumuşak tire, satır/paragraf ayracı, doldurucular). */
const INVISIBLE_CODES = new Set([
  0x200b, 0x200c, 0x200d, 0x2060, 0xfeff, 0x00ad, 0x2028, 0x2029,
  0x034f, // birleştirici grafem birleştirici
  0x180e, // Moğol sesli harf ayracı
  0x3164, 0xffa0, // Hangul doldurucular
]);

/** Görünmez aralıklar: görünmez matematik işleçleri (2061-2064) ve etiket karakterleri (E0000-E007F, astral). */
const INVISIBLE_RANGES: readonly (readonly [number, number])[] = [
  [0x2061, 0x2064],
  [0xe0000, 0xe007f],
];

/** Hermes'te \p{Cf} gibi Unicode özelliklerine güvenilmez; kod noktaları elle denetlenir. */
const isInvisible = (cp: number): boolean =>
  INVISIBLE_CODES.has(cp) || INVISIBLE_RANGES.some(([from, to]) => cp >= from && cp <= to);

/**
 * Kontrol (Cc), çift yönlü yönlendirme (202A-202E, 2066-2069, 200E, 200F, 061C) ve
 * görünmez biçim karakterlerini yakalar. Metinlerde kabul edilmez.
 * Astral kod noktaları (ör. etiket karakterleri) `codePointAt` ile doğru işlenir.
 */
export function hasForbiddenChar(text: string): boolean {
  for (let i = 0; i < text.length; ) {
    const c = text.codePointAt(i) as number;
    i += c > 0xffff ? 2 : 1;
    const control = c <= 0x1f || (c >= 0x7f && c <= 0x9f);
    const bidi =
      (c >= 0x202a && c <= 0x202e) || (c >= 0x2066 && c <= 0x2069) || c === 0x200e || c === 0x200f || c === 0x061c;
    if (control || bidi || isInvisible(c)) return true;
  }
  return false;
}

/** Boşluk ve görünmez karakterlerden başka hiçbir şey yoksa true. */
export const isBlank = (text: string): boolean =>
  Array.from(text).every((ch) => isInvisible(ch.codePointAt(0) as number) || ch.trim() === '');

const invalid = (message: string) => new ServiceError('invalid', message);

/** Doğrulanmış, kırpılmış etiketi döner; geçersiz giriş ServiceError('invalid') ile reddedilir. */
export function validateZone(zone: Omit<PrivacyZone, 'id'>): string {
  const raw = typeof zone.label === 'string' ? zone.label : '';
  if (isBlank(raw)) throw invalid('Bölgeye bir ad ver.');
  const label = raw.trim();
  if ([...label].length > ZONE_LABEL_MAX_LENGTH) {
    throw invalid(`Bölge adı en fazla ${ZONE_LABEL_MAX_LENGTH} karakter olabilir.`);
  }
  if (hasForbiddenChar(label)) throw invalid('Bölge adında geçersiz karakter var.');
  if (!(ZONE_RADIUS_OPTIONS as readonly number[]).includes(zone.radiusM)) {
    throw invalid('Yarıçap geçersiz.');
  }
  if (!Number.isFinite(zone.lat) || zone.lat < -90 || zone.lat > 90) {
    throw invalid('Enlem -90 ile 90 arasında olmalı.');
  }
  if (!Number.isFinite(zone.lng) || zone.lng < -180 || zone.lng > 180) {
    throw invalid('Boylam -180 ile 180 arasında olmalı.');
  }
  return label;
}

/** Mevcut bölge sayısı sınıra ulaştıysa ServiceError('invalid'). */
export function assertZoneCapacity(currentCount: number): void {
  if (currentCount >= MAX_ZONES_PER_USER) {
    throw invalid(`En fazla ${MAX_ZONES_PER_USER} bölge ekleyebilirsin.`);
  }
}

/** Anahtar-değer deposu (SecureStore, localStorage ya da test için bellek). */
export type KeyValueBackend = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

/**
 * Parça başına en çok bayt. iOS Keychain geçmişte ~2048 baytın üstündeki değerleri reddetti;
 * Supabase oturumu (iki JWT + kullanıcı) bundan büyük olabilir, bu yüzden parçalanır.
 */
export const MAX_CHUNK_BYTES = 1800;

function utf8Length(codePoint: number): number {
  if (codePoint < 0x80) return 1;
  if (codePoint < 0x800) return 2;
  if (codePoint < 0x10000) return 3;
  return 4;
}

/** Metni, her parça en çok `maxBytes` UTF-8 bayt olacak şekilde böler; karakter (vekil çift dahil) ortadan kesilmez. */
export function splitByBytes(value: string, maxBytes: number): string[] {
  const chunks: string[] = [];
  let current = '';
  let currentBytes = 0;
  for (const char of value) {
    const bytes = utf8Length(char.codePointAt(0) ?? 0);
    if (currentBytes + bytes > maxBytes && current !== '') {
      chunks.push(current);
      current = '';
      currentBytes = 0;
    }
    current += char;
    currentBytes += bytes;
  }
  chunks.push(current);
  return chunks;
}

/** Sayaç okunamazken artık parçaları temizlemek için denenen en yüksek parça sayısı (4 KB oturum ~3 parça). */
export const MAX_CLEANUP_CHUNKS = 20;

const countKey = (key: string) => `${key}.chunks`;
const chunkKey = (key: string, index: number) => `${key}.chunk${index}`;

/**
 * Büyük değerleri parçalayan depo adaptörü. Değer `<anahtar>.chunk0`, `.chunk1` ... olarak yazılır,
 * parça sayısı `<anahtar>.chunks` anahtarındadır (en son yazılır; yarım yazım okunmaz).
 * Anahtarlar SecureStore kuralına uyar: harf, rakam, `.`, `-`, `_`.
 */
export function createChunkedStorage(backend: KeyValueBackend, maxBytes: number = MAX_CHUNK_BYTES): KeyValueBackend {
  const readCount = async (key: string): Promise<number> => {
    const raw = await backend.getItem(countKey(key));
    const count = raw == null ? 0 : Number.parseInt(raw, 10);
    return Number.isInteger(count) && count > 0 ? count : 0;
  };

  return {
    async getItem(key) {
      const count = await readCount(key);
      if (count === 0) return null;
      const parts: string[] = [];
      for (let i = 0; i < count; i += 1) {
        const part = await backend.getItem(chunkKey(key, i));
        // Eksik parça: değer bozuk, oturum yok sayılır.
        if (part == null) return null;
        parts.push(part);
      }
      return parts.join('');
    },
    async setItem(key, value) {
      const previousCount = await readCount(key);
      const chunks = splitByBytes(value, maxBytes);
      for (let i = 0; i < chunks.length; i += 1) {
        await backend.setItem(chunkKey(key, i), chunks[i]);
      }
      await backend.setItem(countKey(key), String(chunks.length));
      for (let i = chunks.length; i < previousCount; i += 1) {
        await backend.removeItem(chunkKey(key, i));
      }
    },
    async removeItem(key) {
      const count = await readCount(key);
      await backend.removeItem(countKey(key));
      // Sayaç bozuk ya da yoksa (yarım yazım) parça sayısı bilinmez: makul üst sınıra kadar hepsi silinir,
      // çıkıştan sonra depoda oturum parçası kalmasın.
      const limit = count > 0 ? Math.max(count, MAX_CLEANUP_CHUNKS) : MAX_CLEANUP_CHUNKS;
      for (let i = 0; i < limit; i += 1) {
        await backend.removeItem(chunkKey(key, i));
      }
    },
  };
}

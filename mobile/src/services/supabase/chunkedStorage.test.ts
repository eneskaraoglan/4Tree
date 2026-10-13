import { createChunkedStorage, MAX_CHUNK_BYTES, splitByBytes, type KeyValueBackend } from './chunkedStorage';

const utf8Bytes = (value: string) => new TextEncoder().encode(value).length;

/** Bellekte çalışan sahte depo; gerçek SecureStore gibi anahtar kuralını denetler. */
function createMemoryBackend() {
  const data = new Map<string, string>();
  const backend: KeyValueBackend = {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      if (!/^[A-Za-z0-9._-]+$/.test(key)) throw new Error(`Geçersiz anahtar: ${key}`);
      data.set(key, value);
    },
    removeItem: async (key) => {
      data.delete(key);
    },
  };
  return { backend, data };
}

describe('splitByBytes', () => {
  it('kısa metni tek parça bırakır, boş metin için tek boş parça verir', () => {
    expect(splitByBytes('merhaba', 1800)).toEqual(['merhaba']);
    expect(splitByBytes('', 1800)).toEqual(['']);
  });

  it('her parçayı bayt sınırının altında tutar ve birleşince özgün metni verir (çok baytlı karakterler dahil)', () => {
    const value = 'şğüöçıİ😀'.repeat(900);
    const chunks = splitByBytes(value, 1800);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(utf8Bytes(chunk)).toBeLessThanOrEqual(1800);
    expect(chunks.join('')).toBe(value);
  });

  it('vekil çifti (emoji) ortadan kesmez', () => {
    const chunks = splitByBytes('😀😀😀', 5);
    expect(chunks).toEqual(['😀', '😀', '😀']);
  });
});

describe('createChunkedStorage', () => {
  it('büyük değeri ~1800 baytlık parçalara bölüp geri birleştirir', async () => {
    const { backend, data } = createMemoryBackend();
    const storage = createChunkedStorage(backend);
    const session = JSON.stringify({ access_token: 'a'.repeat(4000), refresh_token: 'r'.repeat(900), name: 'Şule' });

    await storage.setItem('sb-proje-auth-token', session);

    const chunkKeys = [...data.keys()].filter((key) => key.includes('.chunk') && !key.endsWith('.chunks'));
    expect(chunkKeys.length).toBe(Math.ceil(utf8Bytes(session) / MAX_CHUNK_BYTES));
    for (const key of chunkKeys) expect(utf8Bytes(data.get(key) ?? '')).toBeLessThanOrEqual(MAX_CHUNK_BYTES);
    expect(await storage.getItem('sb-proje-auth-token')).toBe(session);
  });

  it('olmayan anahtar için null döner', async () => {
    const storage = createChunkedStorage(createMemoryBackend().backend);
    expect(await storage.getItem('yok')).toBeNull();
  });

  it('daha kısa değer yazınca eski artık parçaları siler', async () => {
    const { backend, data } = createMemoryBackend();
    const storage = createChunkedStorage(backend, 10);
    await storage.setItem('anahtar', 'x'.repeat(35));
    expect(data.get('anahtar.chunks')).toBe('4');

    await storage.setItem('anahtar', 'kisa');
    expect(await storage.getItem('anahtar')).toBe('kisa');
    expect([...data.keys()].sort()).toEqual(['anahtar.chunk0', 'anahtar.chunks']);
  });

  it('removeItem tüm parçaları ve sayaç anahtarını kaldırır', async () => {
    const { backend, data } = createMemoryBackend();
    const storage = createChunkedStorage(backend, 10);
    await storage.setItem('anahtar', 'y'.repeat(50));
    await storage.removeItem('anahtar');
    expect(data.size).toBe(0);
    expect(await storage.getItem('anahtar')).toBeNull();
  });

  it('parçalardan biri eksikse (bozuk/yarım yazım) değeri yok sayar', async () => {
    const { backend, data } = createMemoryBackend();
    const storage = createChunkedStorage(backend, 10);
    await storage.setItem('anahtar', 'z'.repeat(30));
    data.delete('anahtar.chunk1');
    expect(await storage.getItem('anahtar')).toBeNull();
  });

  it('bozuk sayaç değerini yok sayar', async () => {
    const { backend } = createMemoryBackend();
    await backend.setItem('anahtar.chunks', 'abc');
    expect(await createChunkedStorage(backend).getItem('anahtar')).toBeNull();
  });
});

describe('createChunkedStorage removeItem (bozuk sayaç)', () => {
  it('sayaç yoksa ya da bozuksa bile artık parçaları üst sınıra kadar siler', async () => {
    const { backend, data } = createMemoryBackend();
    for (let i = 0; i < 5; i += 1) data.set(`anahtar.chunk${i}`, `parca${i}`);
    data.set('anahtar.chunks', 'bozuk');
    await createChunkedStorage(backend).removeItem('anahtar');
    expect(data.size).toBe(0);

    // Sayaç hiç yazılamamış (yarım yazım): yalnız parçalar kalmış.
    data.set('anahtar.chunk0', 'a');
    data.set('anahtar.chunk3', 'b');
    await createChunkedStorage(backend).removeItem('anahtar');
    expect(data.size).toBe(0);
  });

  it('`-code-verifier` anahtarı da ayrı anahtar olarak tamamen silinir', async () => {
    const { backend, data } = createMemoryBackend();
    const storage = createChunkedStorage(backend, 10);
    await storage.setItem('fourtree.auth', 'o'.repeat(45));
    await storage.setItem('fourtree.auth-code-verifier', 'v'.repeat(25));
    await storage.removeItem('fourtree.auth');
    await storage.removeItem('fourtree.auth-code-verifier');
    expect(data.size).toBe(0);
  });
});

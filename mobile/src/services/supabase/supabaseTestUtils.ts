/**
 * Yalnız testler için: Supabase istemcisinin zincirlenebilir sorgu oluşturucusunu gerçeğe yakın taklit eder.
 * - Yalnız bilinen zincir metotları vardır; bilinmeyen metot çağrısı hata fırlatır.
 * - Sonuç şekli doğrulanır: single()/maybeSingle() tek nesne, diğerleri dizi bekler;
 *   select() çağrılmayan yazma sorgusu veri döndüremez.
 * Uygulama kodundan import edilmez.
 */
export type FakeResult = { data?: unknown; error?: unknown; count?: number | null };
export type RecordedCall = [method: string, args: unknown[]];
export type RecordedQuery = { table: string; calls: RecordedCall[] };

const KNOWN_METHODS = new Set([
  'select', 'insert', 'upsert', 'update', 'delete', 'eq', 'in', 'order', 'limit', 'single', 'maybeSingle',
]);
const MUTATIONS = new Set(['insert', 'upsert', 'update', 'delete']);

function assertShape(result: FakeResult, record: RecordedQuery): void {
  const methods = record.calls.map(([name]) => name);
  const single = methods.includes('single') || methods.includes('maybeSingle');
  const mutating = methods.some((m) => MUTATIONS.has(m));
  const head = record.calls.some(([name, args]) => name === 'select' && (args[1] as { head?: boolean })?.head);
  const { data } = result;
  const where = `[fake ${record.table}]`;

  if (data === null || data === undefined) return;
  if (head) throw new Error(`${where} head sorgusu veri döndüremez`);
  if (mutating && !methods.includes('select')) throw new Error(`${where} select() olmadan yazma sorgusu veri döndüremez`);
  if (single && Array.isArray(data)) throw new Error(`${where} single()/maybeSingle() dizi değil tek nesne döner`);
  if (!single && !Array.isArray(data)) throw new Error(`${where} single() olmadan sorgu dizi döner`);
}

function createQuery(result: FakeResult, record: RecordedQuery) {
  const query: unknown = new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof prop === 'symbol') return undefined;
        if (prop === 'then') {
          return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
            try {
              assertShape(result, record);
            } catch (error) {
              return Promise.reject(error).then(resolve, reject);
            }
            return Promise.resolve({ data: null, error: null, count: null, ...result }).then(resolve, reject);
          };
        }
        if (!KNOWN_METHODS.has(prop)) throw new Error(`[fake ${record.table}] bilinmeyen sorgu metodu: ${prop}`);
        return (...args: unknown[]) => {
          record.calls.push([prop, args]);
          return query;
        };
      },
    },
  );
  return query;
}

export type FakeSetup = {
  /** Tablo için sıradaki yanıt kuyruğu; son yanıt tekrarlanır. */
  tables?: Record<string, FakeResult | FakeResult[]>;
  /** null: oturum yok. */
  userId?: string | null;
  sessionError?: unknown;
};

/** `supabase.from` ve `supabase.auth.getSession` mock'larını kurar; kayıtlı sorguları döner. */
export function setupFakeSupabase(from: jest.Mock, getSession: jest.Mock, setup: FakeSetup = {}) {
  const queues = new Map<string, FakeResult[]>();
  Object.entries(setup.tables ?? {}).forEach(([table, res]) => {
    queues.set(table, Array.isArray(res) ? [...res] : [res]);
  });
  const queries: RecordedQuery[] = [];

  from.mockReset();
  from.mockImplementation((table: string) => {
    const queue = queues.get(table) ?? [{}];
    const result = queue.length > 1 ? (queue.shift() as FakeResult) : queue[0];
    const record: RecordedQuery = { table, calls: [] };
    queries.push(record);
    return createQuery(result, record);
  });

  getSession.mockReset();
  getSession.mockResolvedValue(
    setup.sessionError
      ? { data: { session: null }, error: setup.sessionError }
      : {
          data: { session: setup.userId === null ? null : { user: { id: setup.userId ?? 'user-1' } } },
          error: null,
        },
  );

  // Bilinmeyen hata uyarıları (yalnız geliştirme) test çıktısını kirletmesin; testler isterse denetler.
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

  return {
    queries,
    warn,
    getSessionCalls: () => getSession.mock.calls.length,
    /** Tabloya yapılan çağrılar (sırayla). */
    on: (table: string) => queries.filter((q) => q.table === table),
    /** Bir sorgudaki metot çağrısının argümanları (ilk eşleşme). */
    args: (query: RecordedQuery, method: string): unknown[] | undefined =>
      query.calls.find(([name]) => name === method)?.[1],
    all: (query: RecordedQuery, method: string): unknown[][] =>
      query.calls.filter(([name]) => name === method).map(([, a]) => a),
  };
}

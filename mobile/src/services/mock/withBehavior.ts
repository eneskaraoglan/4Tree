import { ServiceError } from '../errors';

/** Servisin her metoduna yapay gecikme ekler ve istenirse hep reddettirir. */
export function withBehavior<T extends object>(
  service: T,
  options: { fail: boolean; latencyMs: number },
): T {
  if (!options.fail && options.latencyMs <= 0) return service;
  const wrapped = Object.entries(service).map(([key, fn]) => {
    // Metot olmayan alanlar (örn. FeedService.supportedReactions) olduğu gibi geçer.
    if (typeof fn !== 'function') return [key, fn] as const;
    const call = fn as (...args: unknown[]) => Promise<unknown>;
    return [
      key,
      async (...args: unknown[]) => {
        if (options.latencyMs > 0) {
          await new Promise<void>((resolve) => setTimeout(resolve, options.latencyMs));
        }
        if (options.fail) {
          throw new ServiceError('network', 'Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.');
        }
        return call(...args);
      },
    ] as const;
  });
  return Object.fromEntries(wrapped) as T;
}

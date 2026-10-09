import type { ForestTree } from '@/types';

export interface ForestService {
  /** Yeniden eskiye sıralı. Sertifika, bölge ve sponsor temsilidir. */
  getTrees(): Promise<ForestTree[]>;
}

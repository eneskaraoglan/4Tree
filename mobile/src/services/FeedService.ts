import type { FeedPost } from '@/types';

export type FeedScope = 'friends' | 'everyone';

/** Tepki çağrıları idempotenttir: aynı değer tekrar gönderilirse sayı değişmez. */
export interface FeedService {
  /**
   * Yeniden eskiye sıralı. 'friends' yalnız isFriend olan gönderileri (Elif'in kendisi dahil),
   * 'everyone' (varsayılan) tüm gönderileri döner.
   */
  getPosts(scope?: FeedScope): Promise<FeedPost[]>;
  /** Alkışı verir (true) ya da geri alır (false); güncel gönderiyi döner. Bulunamazsa ServiceError('not_found'). */
  setClap(postId: string, value: boolean): Promise<FeedPost>;
  /** Su vermeyi verir (true) ya da geri alır (false); güncel gönderiyi döner. Bulunamazsa ServiceError('not_found'). */
  setWater(postId: string, value: boolean): Promise<FeedPost>;
}

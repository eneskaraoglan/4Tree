import type { FeedComment, FeedPost, ReactionType, RoutePoint } from '@/types';

export type FeedScope = 'friends' | 'everyone';

export type FeedPaginationOptions = {
  cursor?: string | null;
  limit?: number;
};

export type CreatePostInput = {
  caption?: string;
  runId?: string;
  distanceKm?: number;
  durationSec?: number;
  activityType?: 'run' | 'walk';
  place?: string;
  route?: RoutePoint[];
};

/** Tepki çağrısı idempotenttir: aynı değer tekrar gönderilirse sayı değişmez. */
export interface FeedService {
  /** Bu servisin desteklediği tepki türleri (arayüz seçicide yalnız bunları gösterir). */
  readonly supportedReactions: readonly ReactionType[];
  /**
   * Yeniden eskiye sıralı. 'friends' yalnız isFriend olan gönderileri (Elif'in kendisi dahil),
   * 'everyone' (varsayılan) tüm gönderileri döner. Seçenek verilirse sayfalama uygular.
   */
  getPosts(scope?: FeedScope, options?: FeedPaginationOptions): Promise<FeedPost[]>;
  /** Belirli bir gönderiyi döner; bulunamazsa ServiceError('not_found'). */
  getPost(postId: string): Promise<FeedPost>;
  /** Yeni bir gönderi paylaşır. */
  createPost(input: CreatePostInput): Promise<FeedPost>;
  /** Kendi gönderisini siler. */
  deletePost(postId: string): Promise<void>;
  /** Kendi gönderisinin açıklamasını günceller. */
  updatePost(postId: string, patch: { caption?: string }): Promise<FeedPost>;
  /**
   * Kullanıcının bu gönderideki tek tepkisini belirler (öncekinin yerine geçer) ya da null ile geri alır;
   * güncel gönderiyi döner. Desteklenmeyen tür ServiceError('invalid'), gönderi yoksa ServiceError('not_found').
   */
  setReaction(postId: string, reaction: ReactionType | null): Promise<FeedPost>;
  /** Gönderiye ait yorumları döner (yanıtlarıyla birlikte). */
  getComments(postId: string): Promise<FeedComment[]>;
  /** Gönderiye yeni yorum veya bir yoruma yanıt ekler. */
  addComment(postId: string, body: string, parentId?: string | null): Promise<FeedComment>;
  /** Kendi yorumunu siler. */
  deleteComment(commentId: string): Promise<void>;
  /** Yoruma tepki verir veya geri alır. */
  setCommentReaction(commentId: string, reaction: ReactionType | null): Promise<FeedComment>;
}

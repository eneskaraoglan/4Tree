import type { ActivityType, RoutePoint } from './activity';

export type FeedAuthor = {
  id: string;
  name: string;
  avatarInitial: string;
};

export type FeedActivitySummary = {
  type: ActivityType;
  distanceKm: number;
  durationSec: number;
  paceSecPerKm: number;
  place: string;
  /** Gönderi kartında gösterilen rota önizlemesi. */
  route?: RoutePoint[];
};

/** Tepki türleri; kişi başına bir gönderide tek tepki. Sıra/ikon/renk: components/reactions/reactions.ts. */
export type ReactionType = 'water' | 'clap' | 'leaf' | 'heart' | 'power';

export type ReactionCounts = Partial<Record<ReactionType, number>>;

export type FeedPost = {
  id: string;
  author: FeedAuthor;
  /** Elif'in kendisi ve arkadaşları için true; Herkes sekmesinde tanımadıkları false. */
  isFriend: boolean;
  caption?: string;
  activity: FeedActivitySummary;
  treesEarned: number;
  /** Türe göre tepki sayıları (kullanıcının kendi tepkisi dahil); sayısı 0 olan tür eksik olabilir. */
  reactionCounts: ReactionCounts;
  /** Giriş yapmış kullanıcının bu gönderideki tek tepkisi; yoksa null. */
  myReaction: ReactionType | null;
  commentCount: number;
  /** ISO 8601. */
  createdAt: string;
};

export type FeedComment = {
  id: string;
  postId: string;
  author: FeedAuthor;
  body: string;
  parentId?: string | null;
  reactionCounts: ReactionCounts;
  myReaction: ReactionType | null;
  createdAt: string;
  /** Alt yanıtlar (iki seviye: ana yorum ve yanıtları). */
  replies?: FeedComment[];
};

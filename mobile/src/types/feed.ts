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

export type FeedPost = {
  id: string;
  author: FeedAuthor;
  /** Elif'in kendisi ve arkadaşları için true; Herkes sekmesinde tanımadıkları false. */
  isFriend: boolean;
  caption?: string;
  activity: FeedActivitySummary;
  treesEarned: number;
  clapCount: number;
  waterCount: number;
  /** Giriş yapmış kullanıcının bu gönderiye verdiği tepkiler. */
  myReactions: { clapped: boolean; watered: boolean };
  commentCount: number;
  /** ISO 8601. */
  createdAt: string;
};

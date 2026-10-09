export type Badge = {
  id: string;
  name: string;
  description: string;
  earned: boolean;
  /** ISO 8601; sadece kazanılmış rozetlerde. */
  earnedAt?: string;
};

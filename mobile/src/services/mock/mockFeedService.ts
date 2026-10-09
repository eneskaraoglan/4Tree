import type { FeedPost } from '@/types';

import { ServiceError } from '../errors';
import type { FeedService } from '../FeedService';

/** Rota noktaları dahil derin kopya; dışarıdaki mutasyon iç durumu etkilemez. */
const copy = (p: FeedPost): FeedPost => ({
  ...p,
  author: { ...p.author },
  activity: {
    ...p.activity,
    ...(p.activity.route ? { route: p.activity.route.map((point) => ({ ...point })) } : {}),
  },
  myReactions: { ...p.myReactions },
});

/** Tepkiler bellekte tutulur; durum her fabrika çağrısında bağımsızdır. */
export function createMockFeedService(initialPosts: FeedPost[]): FeedService {
  const posts = initialPosts.map(copy);

  const find = (id: string): FeedPost => {
    const post = posts.find((p) => p.id === id);
    if (!post) throw new ServiceError('not_found', 'Bu gönderi artık yok.');
    return post;
  };

  return {
    getPosts: async (scope = 'everyone') =>
      posts.filter((p) => scope === 'everyone' || p.isFriend).map(copy),
    setClap: async (postId, value) => {
      const post = find(postId);
      if (post.myReactions.clapped !== value) {
        post.myReactions.clapped = value;
        post.clapCount += value ? 1 : -1;
      }
      return copy(post);
    },
    setWater: async (postId, value) => {
      const post = find(postId);
      if (post.myReactions.watered !== value) {
        post.myReactions.watered = value;
        post.waterCount += value ? 1 : -1;
      }
      return copy(post);
    },
  };
}

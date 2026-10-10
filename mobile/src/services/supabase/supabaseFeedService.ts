import type { FeedPost } from '@/types';
import type { FeedScope, FeedService } from '../FeedService';
import { supabase } from './supabaseClient';
import { buildMockFeed } from '../mock/mockFeed';

export function createSupabaseFeedService(): FeedService {
  return {
    getPosts: async (scope: FeedScope = 'everyone'): Promise<FeedPost[]> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
          .from('feed_posts_view')
          .select('*')
          .order('created_at', { ascending: false });

        if (error || !data || data.length === 0) {
          const mockPosts = buildMockFeed();
          if (scope === 'friends') {
            return mockPosts.filter((p) => p.isFriend);
          }
          return mockPosts;
        }

        const posts: FeedPost[] = data.map((row: any) => ({
          id: row.id,
          author: {
            id: row.user_id,
            name: row.full_name || 'Kullanıcı',
            avatarInitial: (row.full_name || 'K')[0].toUpperCase(),
          },
          isFriend: user ? row.user_id === user.id : true,
          caption: row.caption || undefined,
          activity: {
            type: row.activity_type || 'run',
            distanceKm: Number(row.distance_km || 0),
            durationSec: Number(row.duration_sec || 0),
            paceSecPerKm: Number(row.pace_sec_per_km || 0),
            place: row.place || 'İstanbul',
            route: Array.isArray(row.route) ? row.route : [],
          },
          treesEarned: Number(row.trees_earned || 0),
          clapCount: Number(row.clap_count || 0),
          waterCount: Number(row.water_count || 0),
          myReactions: { clapped: false, watered: false },
          commentCount: Number(row.comment_count || 0),
          createdAt: row.created_at,
        }));

        if (scope === 'friends') {
          return posts.filter((p) => p.isFriend);
        }
        return posts;
      } catch (e) {
        return buildMockFeed();
      }
    },

    setClap: async (postId: string, value: boolean): Promise<FeedPost> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (value) {
          await supabase.from('post_reactions').upsert({
            post_id: postId,
            user_id: user.id,
            reaction_type: 'clap',
          });
        } else {
          await supabase.from('post_reactions').delete().match({
            post_id: postId,
            user_id: user.id,
            reaction_type: 'clap',
          });
        }
      }

      const posts = await createSupabaseFeedService().getPosts('everyone');
      const target = posts.find((p) => p.id === postId);
      if (target) {
        target.myReactions.clapped = value;
        target.clapCount = value ? target.clapCount + 1 : Math.max(0, target.clapCount - 1);
        return target;
      }
      throw new Error('not_found');
    },

    setWater: async (postId: string, value: boolean): Promise<FeedPost> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (value) {
          await supabase.from('post_reactions').upsert({
            post_id: postId,
            user_id: user.id,
            reaction_type: 'water',
          });
        } else {
          await supabase.from('post_reactions').delete().match({
            post_id: postId,
            user_id: user.id,
            reaction_type: 'water',
          });
        }
      }

      const posts = await createSupabaseFeedService().getPosts('everyone');
      const target = posts.find((p) => p.id === postId);
      if (target) {
        target.myReactions.watered = value;
        target.waterCount = value ? target.waterCount + 1 : Math.max(0, target.waterCount - 1);
        return target;
      }
      throw new Error('not_found');
    },
  };
}

import { useLocalSearchParams, useRouter } from 'expo-router';

import { PostDetailScreen } from '@/features/feed/PostDetailScreen';

export default function PostDetailRoute() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const router = useRouter();

  return (
    <PostDetailScreen
      postId={postId ?? 'post-001'}
      onPressAuthor={(userId) => {
        router.push({ pathname: '/user-profile', params: { userId } } as any);
      }}
    />
  );
}

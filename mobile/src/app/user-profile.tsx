import { useLocalSearchParams, useRouter } from 'expo-router';

import { UserProfileScreen } from '@/features/profile/UserProfileScreen';

export default function UserProfileRoute() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();

  return (
    <UserProfileScreen
      userId={userId ?? 'user-mert'}
      onPressPostComments={(postId) => {
        router.push({ pathname: '/post-detail', params: { postId } } as any);
      }}
    />
  );
}

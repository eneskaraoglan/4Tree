import { useRouter } from 'expo-router';

import { FriendsScreen } from '@/features/profile/FriendsScreen';

export default function FriendsRoute() {
  const router = useRouter();

  return (
    <FriendsScreen
      onPressUser={(userId) => {
        router.push({ pathname: '/user-profile', params: { userId } } as any);
      }}
    />
  );
}

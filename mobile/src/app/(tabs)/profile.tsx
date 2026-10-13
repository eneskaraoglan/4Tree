import { useRouter, type Href } from 'expo-router';

import { useSignOut } from '@/features/auth';
import { ProfileScreen } from '@/features/profile/ProfileScreen';

const editProfileHref = '/edit-profile' as Href;
const friendsHref = '/friends' as Href;

export default function ProfileRoute() {
  const signOut = useSignOut();
  const router = useRouter();
  return (
    <ProfileScreen
      onSignOut={signOut}
      onEditProfile={() => router.push(editProfileHref)}
      onOpenFriends={() => router.push(friendsHref)}
    />
  );
}

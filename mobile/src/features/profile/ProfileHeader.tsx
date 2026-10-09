import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { profileTr } from '@/i18n';
import { spacing } from '@/theme';
import type { Profile } from '@/types';

import { OrganicAvatar } from './OrganicAvatar';

type Props = { profile: Profile; sinceLabel: string | null };

/** Avatar, ad, seviye adı ve "... beri" satırı. */
export function ProfileHeader({ profile, sinceLabel }: Props) {
  return (
    <View style={styles.row}>
      <OrganicAvatar name={profile.name} initial={profile.avatarInitial} />
      <View style={styles.texts}>
        <AppText variant="title1" accessibilityRole="header" numberOfLines={2}>
          {profile.name}
        </AppText>
        <AppText variant="title3" color="gold">
          {profileTr.levels[profile.level]}
        </AppText>
        {sinceLabel ? (
          <AppText variant="secondary" color="textSecondary">
            {sinceLabel}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', columnGap: spacing.xl },
  texts: { flex: 1, rowGap: spacing.xs },
});

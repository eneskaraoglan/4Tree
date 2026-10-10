import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ProfileScreen } from '@/features/profile/ProfileScreen';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/AuthModal';
import { AppText } from '@/components/AppText';
import { colors, radius, spacing } from '@/theme';

export default function ProfileRoute() {
  const { user, signOut } = useAuth();
  const [authVisible, setAuthVisible] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <AppText variant="small" color="textSecondary">
          {user ? `Oturum: ${user.email}` : 'Misafir Modu'}
        </AppText>
        <Pressable style={styles.authBtn} onPress={() => (user ? signOut() : setAuthVisible(true))}>
          <AppText variant="small" color="onPrimary">
            {user ? 'Çıkış Yap' : 'Giriş / Kayıt'}
          </AppText>
        </Pressable>
      </View>

      <ProfileScreen onSignOut={user ? signOut : undefined} />

      <AuthModal visible={authVisible} onClose={() => setAuthVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  authBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
});

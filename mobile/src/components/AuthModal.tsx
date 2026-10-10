import React, { useState } from 'react';
import { Modal, View, StyleSheet, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { AppText } from '@/components/AppText';
import { colors, radius, spacing } from '@/theme';
import { useAuth } from '@/context/AuthContext';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function AuthModal({ visible, onClose }: Props) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!email || !password || (mode === 'signup' && !name)) {
      setErrorMsg('Lütfen tüm alanları doldurun.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const res = await signIn(email, password);
        if (res.error) throw res.error;
      } else {
        const res = await signUp(name, email, password);
        if (res.error) throw res.error;
      }
      onClose();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <AppText variant="title1" style={styles.title}>
            {mode === 'signin' ? 'Giriş Yap' : 'Kayıt Ol'}
          </AppText>
          <AppText variant="body" color="textSecondary" style={styles.subtitle}>
            4Tree hesabı ile koşularınızı canlı kaydedin.
          </AppText>

          {errorMsg ? (
            <View style={styles.errorBanner}>
              <AppText variant="small" style={styles.errorText}>
                {errorMsg}
              </AppText>
            </View>
          ) : null}

          {mode === 'signup' && (
            <TextInput
              style={styles.input}
              placeholder="Ad Soyad"
              placeholderTextColor="#8E8E93"
              value={name}
              onChangeText={setName}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="E-posta"
            placeholderTextColor="#8E8E93"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="Şifre"
            placeholderTextColor="#8E8E93"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Pressable style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <AppText variant="title3" color="onPrimary">
                {mode === 'signin' ? 'Giriş Yap' : 'Kayıt Ol'}
              </AppText>
            )}
          </Pressable>

          <Pressable
            style={styles.switchBtn}
            onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
            <AppText variant="body" color="primary">
              {mode === 'signin' ? 'Hesabınız yok mu? Kayıt Olun' : 'Zaten hesabınız var mı? Giriş Yapın'}
            </AppText>
          </Pressable>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <AppText variant="small" color="textTertiary">
              Kapat
            </AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.text,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  switchBtn: { alignItems: 'center', paddingVertical: spacing.xs },
  closeBtn: { alignItems: 'center', marginTop: spacing.xs },
  errorBanner: {
    backgroundColor: '#FF3B301A',
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  errorText: { color: '#FF3B30', textAlign: 'center' },
});

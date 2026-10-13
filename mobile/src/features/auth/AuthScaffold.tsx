import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { forwardRef, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { TreeRings } from '@/components/illustration';
import { authTr } from '@/i18n/auth';
import { colors, screenPadding, spacing, touch, typography } from '@/theme';

/** Başlığın yanındaki küçük ağaç halkası imzası: boyut ve ilerleme sabit, yalnız süs. */
const MARK_SIZE = 72;
const MARK_RINGS = 6;
const MARK_PROGRESS = 0.4;
const BACK_ICON = 28;

type Props = {
  title: string;
  subtitle?: string;
  /** Verilirse geri düğmesi görünür. */
  onBack?: () => void;
  children: ReactNode;
};

/**
 * Giriş formlarının ortak kabuğu: geri düğmesi, başlık, klavyeye uyumlu kaydırma.
 * Başlık ref alır: durum değişince (ör. "Bağlantı yolda") ekran okuyucu odağı oraya taşınır.
 */
export const AuthScaffold = forwardRef<Text, Props>(function AuthScaffold(
  { title, subtitle, onBack, children },
  headingRef,
) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}>
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={authTr.back}
              onPress={onBack}
              hitSlop={8}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
              <MaterialCommunityIcons name="chevron-left" size={BACK_ICON} color={colors.textSecondary} />
              <AppText variant="body" color="textSecondary">
                {authTr.back}
              </AppText>
            </Pressable>
          ) : null}

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text ref={headingRef} accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
              {subtitle ? (
                <AppText variant="body" color="textSecondary" style={styles.subtitle}>
                  {subtitle}
                </AppText>
              ) : null}
            </View>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.mark}>
              <TreeRings progress={MARK_PROGRESS} size={MARK_SIZE} rings={MARK_RINGS} showTip={false} seed={7} />
            </View>
          </View>

          <View style={styles.body}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: screenPadding, paddingBottom: spacing.xxxl },
  back: {
    minHeight: touch.min,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -spacing.sm,
  },
  pressed: { opacity: 0.6 },
  header: { flexDirection: 'row', alignItems: 'flex-start', columnGap: spacing.lg, marginTop: spacing.lg },
  headerText: { flex: 1 },
  title: { ...typography.title1, color: colors.text },
  subtitle: { marginTop: spacing.sm },
  mark: { marginTop: -spacing.xs },
  body: { marginTop: spacing.xxxl, rowGap: spacing.xl },
});

// Arka plan konum görevi modül düzeyinde tanımlanmalı; zincir ayrıntısı backgroundTask.ts başında.
import '@/features/activity/backgroundTask';

import { Stack, useLocalSearchParams } from 'expo-router';

import { ActivityScreen, type ActivityMode } from '@/features/activity';

export default function ActivityRoute() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const activityMode: ActivityMode = mode === 'resume' || mode === 'finish' ? mode : 'new';
  return (
    <>
      {/* Kayıt sırasında kaydırarak geri dönmek aktiviteyi kapatmasın. */}
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <ActivityScreen mode={activityMode} />
    </>
  );
}

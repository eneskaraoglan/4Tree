// Arka plan konum görevi modül düzeyinde tanımlanmalı (uygulama arka planda açılırsa React ağacı yoktur).
import '@/features/activity/backgroundTask';

import { RunScreen } from '@/features/run';

export default function RunRoute() {
  return <RunScreen />;
}

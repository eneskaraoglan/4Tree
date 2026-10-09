import type { Badge } from '@/types';

export const MOCK_BADGES: Badge[] = [
  { id: 'first-5k', name: 'İlk 5 km', description: 'Tek seferde 5 km tamamla.', earned: true, earnedAt: '2026-08-23T09:04:00+03:00' },
  { id: 'first-tree', name: 'İlk ağaç', description: 'İlk 20 km\'ni tamamla, ilk ağacın dikilsin.', earned: true, earnedAt: '2026-08-30T08:40:00+03:00' },
  { id: 'weekend-warrior', name: 'Hafta sonu savaşçısı', description: 'Aynı hafta sonu hem cumartesi hem pazar hareket et.', earned: true, earnedAt: '2026-09-13T09:30:00+03:00' },
  { id: 'km-100', name: '100 km kulübü', description: 'Toplam 100 km\'ye ulaş.', earned: true, earnedAt: '2026-09-27T08:33:00+03:00' },
  { id: 'early-bird', name: 'Erken kuş', description: 'Sabah 07:00\'den önce başlayan bir koşu yap.', earned: true, earnedAt: '2026-10-09T07:16:00+03:00' },
  { id: 'tree-hero-10', name: '10 ağaç kahramanı', description: '10 ağaç dikilmesini sağla.', earned: false },
  { id: 'half-marathon', name: 'Yarı maraton', description: 'Tek seferde 21,1 km koş.', earned: false },
  { id: 'streak-7', name: 'Yedi gün üst üste', description: 'Art arda 7 gün hareket et.', earned: false },
  { id: 'forest-keeper', name: 'Orman bekçisi', description: '25 ağaca ulaş, Orman seviyesine geç.', earned: false },
];

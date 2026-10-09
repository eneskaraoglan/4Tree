import type { FeedActivitySummary, FeedAuthor, FeedPost } from '@/types';

import { PLACES } from './places';
import { makeRoute, type RouteShape } from './routes';

const none = { clapped: false, watered: false };

type RouteSpec = {
  place: keyof typeof PLACES;
  shape: RouteShape;
  seed: number;
  rotationDeg: number;
};

type PostSeed = Omit<FeedPost, 'activity' | 'isFriend'> & {
  activity: Omit<FeedActivitySummary, 'route'>;
  route: RouteSpec;
};

const ELIF_ID = 'user-elif';
const FRIEND_IDS = new Set([ELIF_ID, 'user-mert', 'user-zeynep', 'user-can', 'user-defne']);

const author = (id: string, name: string): FeedAuthor => ({ id, name, avatarInitial: name[0] });

/** Yeniden eskiye sıralı. Rotalar tohumludur: aynı gönderi her zaman aynı rotayı verir. */
const POST_SEEDS: PostSeed[] = [
  {
    id: 'post-001',
    author: author('user-mert', 'Mert'),
    caption: 'Sisli bir sabahtı, Belgrad\'da ilk kez 10\'u gördüm.',
    activity: { type: 'run', distanceKm: 10.2, durationSec: 3366, paceSecPerKm: 330, place: 'Belgrad Ormanı' },
    route: { place: 'belgrad', shape: 'loop', seed: 102, rotationDeg: 25 },
    treesEarned: 0,
    clapCount: 18,
    waterCount: 4,
    myReactions: { clapped: true, watered: false },
    commentCount: 3,
    createdAt: '2026-10-10T08:05:00+03:00',
  },
  {
    id: 'post-008',
    author: author('user-selin', 'Selin'),
    caption: 'Güne Belgrad\'da başladım, patikalar çok sessizdi.',
    activity: { type: 'run', distanceKm: 7.5, durationSec: 2655, paceSecPerKm: 354, place: 'Belgrad Ormanı' },
    route: { place: 'belgradBentler', shape: 'loop', seed: 101, rotationDeg: 140 },
    treesEarned: 0,
    clapCount: 6,
    waterCount: 1,
    myReactions: none,
    commentCount: 0,
    createdAt: '2026-10-10T07:20:00+03:00',
  },
  {
    id: 'post-002',
    author: author('user-zeynep', 'Zeynep'),
    caption: 'Öğleden sonra Kaz Dağları\'nda yürüdük. Hava harikaydı.',
    activity: { type: 'walk', distanceKm: 8.4, durationSec: 6048, paceSecPerKm: 720, place: 'Kaz Dağları' },
    route: { place: 'kaz', shape: 'winding', seed: 103, rotationDeg: 300 },
    treesEarned: 1,
    clapCount: 24,
    waterCount: 9,
    myReactions: none,
    commentCount: 5,
    createdAt: '2026-10-09T17:40:00+03:00',
  },
  {
    id: 'post-003',
    author: author('user-can', 'Can'),
    activity: { type: 'run', distanceKm: 5.0, durationSec: 1600, paceSecPerKm: 320, place: 'Ege kıyısı' },
    route: { place: 'ege', shape: 'outAndBack', seed: 104, rotationDeg: 80 },
    treesEarned: 0,
    clapCount: 7,
    waterCount: 1,
    myReactions: { clapped: true, watered: true },
    commentCount: 0,
    createdAt: '2026-10-09T07:30:00+03:00',
  },
  {
    id: 'post-004',
    author: author('user-defne', 'Defne'),
    caption: 'Ağacım tamam! Yirmi kilometre doldu.',
    activity: { type: 'run', distanceKm: 6.8, durationSec: 2448, paceSecPerKm: 360, place: 'Bolu' },
    route: { place: 'bolu', shape: 'blocks', seed: 105, rotationDeg: 15 },
    treesEarned: 1,
    clapCount: 31,
    waterCount: 12,
    myReactions: none,
    commentCount: 8,
    createdAt: '2026-10-08T19:15:00+03:00',
  },
  {
    id: 'post-009',
    author: author('user-baris', 'Barış'),
    caption: 'Kaz Dağları\'nda uzun bir patika günü. Bacaklar yandı, manzara değdi.',
    activity: { type: 'run', distanceKm: 14.1, durationSec: 5499, paceSecPerKm: 390, place: 'Kaz Dağları' },
    route: { place: 'kaz', shape: 'winding', seed: 106, rotationDeg: 200 },
    treesEarned: 0,
    clapCount: 15,
    waterCount: 3,
    myReactions: none,
    commentCount: 2,
    createdAt: '2026-10-08T12:30:00+03:00',
  },
  {
    // Elif'in 7 Ekim koşusuyla (activity-013) aynı rota.
    id: 'post-005',
    author: author(ELIF_ID, 'Elif'),
    caption: 'Yedinci ağacım tamam! Sabah koşusuyla 20 kilometre doldu.',
    activity: { type: 'run', distanceKm: 5.1, durationSec: 1724, paceSecPerKm: 338, place: 'Belgrad Ormanı' },
    route: { place: 'belgradKemerburgaz', shape: 'winding', seed: 13, rotationDeg: 215 },
    treesEarned: 1,
    clapCount: 14,
    waterCount: 5,
    myReactions: none,
    commentCount: 2,
    createdAt: '2026-10-07T07:55:00+03:00',
  },
  {
    id: 'post-010',
    author: author('user-ece', 'Ece'),
    caption: 'Bolu\'da akşam turu. Sokaklar boştu, tam kafa dinlemelik.',
    activity: { type: 'run', distanceKm: 5.6, durationSec: 1960, paceSecPerKm: 350, place: 'Bolu' },
    route: { place: 'bolu', shape: 'blocks', seed: 107, rotationDeg: 250 },
    treesEarned: 0,
    clapCount: 9,
    waterCount: 2,
    myReactions: none,
    commentCount: 1,
    createdAt: '2026-10-06T20:10:00+03:00',
  },
  {
    id: 'post-006',
    author: author('user-mert', 'Mert'),
    activity: { type: 'run', distanceKm: 12.0, durationSec: 4080, paceSecPerKm: 340, place: 'Belgrad Ormanı' },
    route: { place: 'belgradKemerburgaz', shape: 'outAndBack', seed: 108, rotationDeg: 110 },
    treesEarned: 0,
    clapCount: 11,
    waterCount: 2,
    myReactions: { clapped: true, watered: false },
    commentCount: 1,
    createdAt: '2026-10-05T08:20:00+03:00',
  },
  {
    id: 'post-007',
    author: author('user-zeynep', 'Zeynep'),
    caption: 'Ege\'de gün batımı yürüyüşü. Yarın sabah koşu var.',
    activity: { type: 'walk', distanceKm: 4.2, durationSec: 2856, paceSecPerKm: 680, place: 'Ege kıyısı' },
    route: { place: 'ege', shape: 'winding', seed: 109, rotationDeg: 340 },
    treesEarned: 0,
    clapCount: 9,
    waterCount: 3,
    myReactions: none,
    commentCount: 1,
    createdAt: '2026-10-03T18:50:00+03:00',
  },
];

/** Her çağrıda taze (paylaşımsız) gönderiler üretir; yeniden eskiye sıralıdır. */
export function buildMockFeed(): FeedPost[] {
  return POST_SEEDS.map(({ route, activity, ...post }) => ({
    ...post,
    isFriend: FRIEND_IDS.has(post.author.id),
    activity: {
      ...activity,
      route: makeRoute({
        center: PLACES[route.place].center,
        shape: route.shape,
        distanceKm: activity.distanceKm,
        rotationDeg: route.rotationDeg,
        seed: route.seed,
      }),
    },
  }));
}

import type { Activity, ActivityType } from '@/types';

import { kmToTrees } from '../conversion';
import { PLACES } from './places';
import { makeRoute, type RouteShape } from './routes';

type Seed = {
  startedAt: string;
  type: ActivityType;
  distanceKm: number;
  paceSecPerKm: number;
  place: keyof typeof PLACES;
  shape: RouteShape;
  rotationDeg: number;
};

/** Eskiden yeniye. Toplam 147,6 km; son 6 kayıt Ekim 2026 koşuları. */
const SEEDS: Seed[] = [
  { startedAt: '2026-08-23T07:30:00+03:00', type: 'run', distanceKm: 15.2, paceSecPerKm: 372, place: 'belgrad', shape: 'loop', rotationDeg: 20 },
  { startedAt: '2026-08-30T07:15:00+03:00', type: 'run', distanceKm: 14.0, paceSecPerKm: 366, place: 'belgradBentler', shape: 'winding', rotationDeg: 200 },
  { startedAt: '2026-09-06T07:45:00+03:00', type: 'run', distanceKm: 18.9, paceSecPerKm: 378, place: 'belgrad', shape: 'outAndBack', rotationDeg: 75 },
  { startedAt: '2026-09-12T18:10:00+03:00', type: 'walk', distanceKm: 7.5, paceSecPerKm: 690, place: 'ege', shape: 'outAndBack', rotationDeg: 130 },
  { startedAt: '2026-09-13T08:00:00+03:00', type: 'run', distanceKm: 15.2, paceSecPerKm: 355, place: 'ege', shape: 'winding', rotationDeg: 310 },
  { startedAt: '2026-09-19T10:20:00+03:00', type: 'walk', distanceKm: 9.8, paceSecPerKm: 720, place: 'kaz', shape: 'loop', rotationDeg: 45 },
  { startedAt: '2026-09-20T08:30:00+03:00', type: 'run', distanceKm: 16.4, paceSecPerKm: 390, place: 'kaz', shape: 'winding', rotationDeg: 250 },
  { startedAt: '2026-09-27T07:20:00+03:00', type: 'run', distanceKm: 12.6, paceSecPerKm: 348, place: 'belgradKemerburgaz', shape: 'loop', rotationDeg: 10 },
  { startedAt: '2026-10-01T19:05:00+03:00', type: 'run', distanceKm: 8.3, paceSecPerKm: 342, place: 'belgrad', shape: 'blocks', rotationDeg: 330 },
  { startedAt: '2026-10-02T07:40:00+03:00', type: 'run', distanceKm: 3.4, paceSecPerKm: 330, place: 'belgradBentler', shape: 'outAndBack', rotationDeg: 160 },
  { startedAt: '2026-10-04T09:00:00+03:00', type: 'run', distanceKm: 10.4, paceSecPerKm: 352, place: 'bolu', shape: 'loop', rotationDeg: 95 },
  { startedAt: '2026-10-05T19:30:00+03:00', type: 'run', distanceKm: 4.6, paceSecPerKm: 336, place: 'belgrad', shape: 'blocks', rotationDeg: 285 },
  { startedAt: '2026-10-07T07:10:00+03:00', type: 'run', distanceKm: 5.1, paceSecPerKm: 338, place: 'belgradKemerburgaz', shape: 'winding', rotationDeg: 215 },
  { startedAt: '2026-10-09T06:40:00+03:00', type: 'run', distanceKm: 6.2, paceSecPerKm: 345, place: 'belgradBentler', shape: 'loop', rotationDeg: 60 },
];

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Yeniden eskiye sıralı, her çağrıda taze (paylaşımsız) mock aktiviteler. */
export function buildMockActivities(): Activity[] {
  let cumulativeKm = 0;
  const ascending = SEEDS.map((seed, index): Activity => {
    const treesBefore = kmToTrees(cumulativeKm);
    cumulativeKm = round1(cumulativeKm + seed.distanceKm);
    const place = PLACES[seed.place];
    return {
      id: `activity-${String(index + 1).padStart(3, '0')}`,
      type: seed.type,
      distanceKm: seed.distanceKm,
      durationSec: Math.round(seed.paceSecPerKm * seed.distanceKm),
      paceSecPerKm: seed.paceSecPerKm,
      startedAt: seed.startedAt,
      place: place.name,
      route: makeRoute({
        center: place.center,
        shape: seed.shape,
        distanceKm: seed.distanceKm,
        rotationDeg: seed.rotationDeg,
        seed: index + 1,
      }),
      treesEarned: kmToTrees(cumulativeKm) - treesBefore,
    };
  });
  return ascending.reverse();
}

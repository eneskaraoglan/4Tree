import type { Activity } from '@/types';

import type { ActivityService } from '../ActivityService';

/** Rota noktaları dahil derin kopya; dışarıdaki mutasyon iç durumu etkilemez. */
const copy = (a: Activity): Activity => ({ ...a, route: a.route.map((p) => ({ ...p })) });

export function createMockActivityService(activities: Activity[]): ActivityService {
  const store = activities.map(copy);
  return {
    getActivities: async () => store.map(copy),
    getActivity: async (id) => {
      const found = store.find((a) => a.id === id);
      return found ? copy(found) : null;
    },
    saveActivity: async (newAct) => {
      const dist = newAct.distanceKm || 5.0;
      const pace = newAct.durationSec > 0 ? Math.round(newAct.durationSec / dist) : 330;
      const act: Activity = {
        id: `act-${Date.now()}`,
        type: newAct.type,
        distanceKm: dist,
        durationSec: newAct.durationSec,
        paceSecPerKm: pace,
        startedAt: newAct.startedAt || new Date().toISOString(),
        place: newAct.place || 'İstanbul',
        route: newAct.route,
        treesEarned: Math.floor(dist / 20),
      };
      store.unshift(act);
      return copy(act);
    },
  };
}

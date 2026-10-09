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
  };
}

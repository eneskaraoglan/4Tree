import type { Activity } from '@/types';

export interface ActivityService {
  /** Yeniden eskiye sıralı. */
  getActivities(): Promise<Activity[]>;
  /** Bulunamazsa null. */
  getActivity(id: string): Promise<Activity | null>;
}

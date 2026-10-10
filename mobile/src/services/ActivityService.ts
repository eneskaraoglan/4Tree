import type { Activity } from '@/types';

export interface ActivityService {
  /** Yeniden eskiye sıralı. */
  getActivities(): Promise<Activity[]>;
  /** Bulunamazsa null. */
  getActivity(id: string): Promise<Activity | null>;
  /** Yeni aktivite kaydeder. */
  saveActivity(activity: {
    type: 'run' | 'walk';
    durationSec: number;
    startedAt?: string;
    place?: string;
    route: { lat: number; lng: number }[];
    distanceKm?: number;
  }): Promise<Activity>;
}

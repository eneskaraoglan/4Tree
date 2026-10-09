import type { Badge } from '@/types';

import type { Services } from '../types';
import { buildMockActivities } from './mockActivities';
import { MOCK_BADGES } from './mockBadges';
import { createMockActivityService } from './mockActivityService';
import { createMockBadgeService } from './mockBadgeService';
import { buildMockFeed } from './mockFeed';
import { createMockFeedService } from './mockFeedService';
import { buildMockTrees } from './mockForest';
import { createMockForestService } from './mockForestService';
import { MOCK_PRIVACY } from './mockPrivacy';
import { createMockPrivacyService } from './mockPrivacyService';
import { buildMockProfile } from './mockProfile';
import { createMockProfileService } from './mockProfileService';
import { withBehavior } from './withBehavior';

export type MockScenario = 'default' | 'empty' | 'error';

export type MockServicesOptions = {
  /** default: Elif'in dolu verisi; empty: yeni kullanıcı; error: tüm çağrılar reddedilir. */
  scenario?: MockScenario;
  /** Her çağrıya eklenen yapay gecikme (ms). Varsayılan 0. */
  latencyMs?: number;
};

/** Her çağrıda taze durumlu (feed tepkileri, gizlilik vb.) yeni bir mock servis seti üretir. */
export function createMockServices(options: MockServicesOptions = {}): Services {
  const { scenario = 'default', latencyMs = 0 } = options;
  const isEmpty = scenario === 'empty';

  const activities = isEmpty ? [] : buildMockActivities();
  const badges: Badge[] = MOCK_BADGES.map((b) =>
    isEmpty ? { id: b.id, name: b.name, description: b.description, earned: false } : { ...b },
  );
  const behavior = { fail: scenario === 'error', latencyMs };

  return {
    profile: withBehavior(createMockProfileService(buildMockProfile(activities)), behavior),
    activity: withBehavior(createMockActivityService(activities), behavior),
    forest: withBehavior(createMockForestService(buildMockTrees(activities)), behavior),
    badge: withBehavior(createMockBadgeService(badges), behavior),
    feed: withBehavior(createMockFeedService(isEmpty ? [] : buildMockFeed()), behavior),
    privacy: withBehavior(
      createMockPrivacyService(isEmpty ? { ...MOCK_PRIVACY, zones: [] } : MOCK_PRIVACY),
      behavior,
    ),
  };
}

import React, { useState } from 'react';
import { RunScreen } from '@/features/run';
import { ActiveRunModal } from '@/features/run/ActiveRunModal';
import { useRunData } from '@/features/run/useRunData';
import type { ActivityType } from '@/types';

export default function RunRoute() {
  const [activeType, setActiveType] = useState<ActivityType | null>(null);
  const { refresh } = useRunData();

  return (
    <>
      <RunScreen onStart={(type) => setActiveType(type)} />
      {activeType ? (
        <ActiveRunModal
          visible={true}
          type={activeType}
          onClose={() => setActiveType(null)}
          onRunSaved={refresh}
        />
      ) : null}
    </>
  );
}

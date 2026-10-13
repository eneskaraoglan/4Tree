import { useCallback, useEffect, useRef, useState } from 'react';

import { useActivityEnvironment, useActivityUserId } from '@/features/activity';
import type { TrackerSnapshot } from '@/features/activity/trackerReducer';

/**
 * Yarım kalan aktivite taslağı (uygulama kapanınca diskte kalır). `reload` odaklanınca çağrılır.
 * Başka hesaba ait taslak gösterilmeden silinir.
 */
export function useActivityDraft() {
  const { drafts } = useActivityEnvironment();
  const userId = useActivityUserId();
  const [draft, setDraft] = useState<TrackerSnapshot | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reload = useCallback(() => {
    if (userId === undefined) return;
    drafts
      .load(userId)
      .then((snapshot) => {
        if (mounted.current) setDraft(snapshot);
      })
      .catch(() => {});
  }, [drafts, userId]);

  // Kullanıcı kimliği okununca ilk yükleme.
  useEffect(() => {
    reload();
  }, [reload]);

  const discard = useCallback(async () => {
    try {
      await drafts.clear();
    } finally {
      if (mounted.current) setDraft(null);
    }
  }, [drafts]);

  return { draft, reload, discard };
}

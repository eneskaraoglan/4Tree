import { useCallback, useEffect, useRef, useState } from 'react';

import { isFailed } from '@/features/activity/activityQueue';
import { useActivityEnvironment, useActivityUserId } from '@/features/activity';
import { useServices } from '@/services';

export type PendingStatus = 'idle' | 'sending' | 'failed';

type Options = {
  /** En az bir aktivite başarıyla gönderilince (listeyi tazelemek için). */
  onSent?: () => void;
};

/**
 * Gönderilmeyi bekleyen aktiviteler (offline kuyruk): sayı, otomatik ve elle gönderim.
 * - `pendingCount`: bağlantı gelince gönderilecekler. `stuckCount`: birkaç denemeden sonra da gönderilemeyenler;
 *   kullanıcı yeniden dener ya da siler.
 * - `flush({ manual: true })` başarısız olursa "failed" durumu gösterilir; otomatik denemeler sessizdir.
 * Başka hesaba ait girişler gösterilmeden silinir.
 */
export function usePendingUploads({ onSent }: Options = {}) {
  const { queue } = useActivityEnvironment();
  const services = useServices();
  const userId = useActivityUserId();
  const [counts, setCounts] = useState({ pendingCount: 0, stuckCount: 0 });
  const [status, setStatus] = useState<PendingStatus>('idle');
  const mounted = useRef(true);
  const onSentRef = useRef(onSent);

  useEffect(() => {
    onSentRef.current = onSent;
  });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refreshCount = useCallback(() => {
    if (userId === undefined) return;
    queue
      .list(userId)
      .then((items) => {
        const stuckCount = items.filter(isFailed).length;
        if (mounted.current) setCounts({ pendingCount: items.length - stuckCount, stuckCount });
      })
      .catch(() => {});
  }, [queue, userId]);

  useEffect(() => {
    refreshCount();
    return queue.subscribe(refreshCount);
  }, [queue, refreshCount]);

  const flush = useCallback(
    async ({ manual = false }: { manual?: boolean } = {}) => {
      if (userId === undefined) return;
      if (manual && mounted.current) setStatus('sending');
      try {
        const result = await queue.flush((input) => services.activity.saveActivity(input), userId);
        if (result.sent > 0) onSentRef.current?.();
        if (mounted.current) setStatus(manual && result.remaining > 0 ? 'failed' : 'idle');
        refreshCount();
      } catch {
        if (mounted.current) setStatus(manual ? 'failed' : 'idle');
      }
    },
    [queue, services, userId, refreshCount],
  );

  /** "Yeniden dene": gönderilemeyenlerin deneme sayısı sıfırlanır ve hemen gönderilir. */
  const retryStuck = useCallback(async () => {
    if (userId === undefined) return;
    await queue.retryFailed(userId);
    await flush({ manual: true });
  }, [queue, userId, flush]);

  const removeStuck = useCallback(async () => {
    if (userId === undefined) return;
    await queue.removeFailed(userId);
    refreshCount();
  }, [queue, userId, refreshCount]);

  return { ...counts, status, flush, retryStuck, removeStuck };
}

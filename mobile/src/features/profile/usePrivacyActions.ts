import { useCallback, useEffect, useRef, useState } from 'react';

import { profileTr } from '@/i18n';
import { ServiceError, useServices } from '@/services';
import type { PrivacySettings, PrivacyZone, Visibility } from '@/types';

import { hapticRemove, hapticSelection, hapticSuccess } from './haptics';

export type ZoneDraft = Omit<PrivacyZone, 'id'>;

/**
 * Gizlilik ayarlarının yerel kopyası ve değiştirme eylemleri.
 * Görünürlük iyimser güncellenir; istekler sıraya girer, böylece hata olursa arayüz her zaman
 * SON ONAYLANMIŞ değere döner. Bölge ekle/sil sunucu yanıtını bekler.
 * `initial` değişirse (sekme yeniden odaklanınca gelen taze veri) yerel kopya, uçuşta istek yoksa güncellenir.
 */
export function usePrivacyActions(initial: PrivacySettings) {
  const { privacy } = useServices();
  const [settings, setSettings] = useState(initial);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const [zoneError, setZoneError] = useState<string | null>(null);
  const [zoneBusy, setZoneBusy] = useState(false);
  /** Son sunucu onaylı görünürlük: iyimser değer başarısız olursa buna dönülür. */
  const confirmedVisibility = useRef<Visibility>(initial.visibility);
  /** Görünürlük istekleri sırayla çalışır: onay sırası = dokunuş sırası. */
  const queue = useRef<Promise<void>>(Promise.resolve());
  const latestRequest = useRef(0);
  /** Uçuştaki (henüz yanıtlanmamış) istek sayısı; taze veri bunları ezmesin. */
  const inFlight = useRef(0);

  useEffect(() => {
    if (inFlight.current > 0) return;
    confirmedVisibility.current = initial.visibility;
    setSettings(initial);
  }, [initial]);

  const selectVisibility = useCallback(
    (next: Visibility): Promise<void> => {
      if (next === settings.visibility) return Promise.resolve();
      const request = ++latestRequest.current;
      hapticSelection();
      setVisibilityError(null);
      setSettings((prev) => ({ ...prev, visibility: next }));
      inFlight.current += 1;
      queue.current = queue.current.then(async () => {
        try {
          const saved = await privacy.setVisibility(next);
          confirmedVisibility.current = saved.visibility;
          if (request === latestRequest.current) {
            setSettings((prev) => ({ ...prev, visibility: saved.visibility }));
          }
        } catch {
          // Eski bir isteğin hatası sessiz kalır: daha yeni bir seçim zaten yoldadır.
          if (request === latestRequest.current) {
            setSettings((prev) => ({ ...prev, visibility: confirmedVisibility.current }));
            setVisibilityError(profileTr.privacy.visibilityError);
          }
        } finally {
          inFlight.current -= 1;
        }
      });
      return queue.current;
    },
    [privacy, settings.visibility],
  );

  const addZone = useCallback(
    async (draft: ZoneDraft): Promise<boolean> => {
      setZoneError(null);
      setZoneBusy(true);
      inFlight.current += 1;
      try {
        const saved = await privacy.addZone(draft);
        setSettings((prev) => ({ ...prev, zones: saved.zones }));
        hapticSuccess();
        return true;
      } catch (error) {
        // Doğrulama mesajları serviste Türkçe yazılır; ağ hatası için genel mesaj.
        setZoneError(
          error instanceof ServiceError && error.code === 'invalid' ? error.message : profileTr.privacy.zoneAddError,
        );
        return false;
      } finally {
        inFlight.current -= 1;
        setZoneBusy(false);
      }
    },
    [privacy],
  );

  const removeZone = useCallback(
    async (zoneId: string): Promise<boolean> => {
      setZoneError(null);
      setZoneBusy(true);
      inFlight.current += 1;
      try {
        const saved = await privacy.removeZone(zoneId);
        setSettings((prev) => ({ ...prev, zones: saved.zones }));
        hapticRemove();
        return true;
      } catch {
        setZoneError(profileTr.privacy.zoneRemoveError);
        return false;
      } finally {
        inFlight.current -= 1;
        setZoneBusy(false);
      }
    },
    [privacy],
  );

  const clearZoneError = useCallback(() => setZoneError(null), []);

  return { settings, visibilityError, zoneError, zoneBusy, selectVisibility, addZone, removeZone, clearZoneError };
}

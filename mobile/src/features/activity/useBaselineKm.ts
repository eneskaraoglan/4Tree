import { useEffect, useState } from 'react';

import { useServices } from '@/services';

/**
 * Aktivite öncesi toplam km (profilden): "Ağacına X km kaldı" için. Alınamazsa null; ekran bu satırı gizler,
 * yanlış bir sayı göstermez. Aktivite kaydı bu veriye bağlı değildir.
 */
export function useBaselineKm(): number | null {
  const services = useServices();
  const [km, setKm] = useState<{ services: typeof services; value: number | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    services.profile
      .getProfile()
      .then((profile) => {
        if (!cancelled) setKm({ services, value: Number.isFinite(profile.totalKm) ? profile.totalKm : null });
      })
      .catch(() => {
        if (!cancelled) setKm({ services, value: null });
      });
    return () => {
      cancelled = true;
    };
  }, [services]);

  return km && km.services === services ? km.value : null;
}

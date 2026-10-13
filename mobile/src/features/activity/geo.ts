const EARTH_RADIUS_M = 6_371_008.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;

type LatLng = { lat: number; lng: number };

/** İki nokta arası büyük daire mesafesi (haversine), metre. */
export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const haversineKm = (a: LatLng, b: LatLng): number => haversineM(a, b) / 1000;

/** Çizim için nokta sayısını azaltır: ilk ve son nokta korunur, aradakiler eşit aralıkla seçilir. */
export function decimate<T>(items: readonly T[], max: number): readonly T[] {
  if (max < 2 || items.length <= max) return items;
  const step = (items.length - 1) / (max - 1);
  const out: T[] = [];
  for (let i = 0; i < max - 1; i++) out.push(items[Math.round(i * step)]);
  out.push(items[items.length - 1]);
  return out;
}

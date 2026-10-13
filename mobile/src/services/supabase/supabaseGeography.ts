import type { RoutePoint } from '@/types';

import { ServiceError } from '../errors';

const UNREADABLE = 'Rota verisi okunamadı.';
const fail = (): never => {
  throw new ServiceError('invalid', UNREADABLE);
};

function toPoint(lng: unknown, lat: unknown): RoutePoint {
  if (
    typeof lng !== 'number' || typeof lat !== 'number' ||
    !Number.isFinite(lng) || !Number.isFinite(lat) ||
    Math.abs(lat) > 90 || Math.abs(lng) > 180
  ) {
    return fail();
  }
  return { lat, lng };
}

function fromGeoJson(value: { type?: unknown; coordinates?: unknown }): RoutePoint[] {
  if (value.type !== 'LineString' || !Array.isArray(value.coordinates)) return fail();
  return value.coordinates.map((pair) => (Array.isArray(pair) ? toPoint(pair[0], pair[1]) : fail()));
}

const EWKB_Z = 0x80000000;
const EWKB_M = 0x40000000;
const EWKB_SRID = 0x20000000;
const WGS84 = 4326;

/** 2D LineString için hex WKB/EWKB (little/big endian, isteğe bağlı SRID). Z/M ve diğer tipler reddedilir. */
function fromHexWkb(hex: string): RoutePoint[] {
  if (hex.length < 18 || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) return fail();
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  const view = new DataView(bytes.buffer);

  if (bytes[0] !== 0 && bytes[0] !== 1) return fail();
  const little = bytes[0] === 1;
  const type = view.getUint32(1, little);
  // Z/M bayrakları (EWKB) ya da ISO kodları (>= 1000) 2D olmayan geometridir.
  if ((type & EWKB_Z) !== 0 || (type & EWKB_M) !== 0 || (type & 0x0fffffff) !== 2) return fail();

  let offset = 5;
  if ((type & EWKB_SRID) !== 0) {
    if (view.getUint32(offset, little) !== WGS84) return fail();
    offset += 4;
  }
  if (bytes.length < offset + 4) return fail();
  const count = view.getUint32(offset, little);
  offset += 4;
  if (bytes.length !== offset + count * 16) return fail();

  const points: RoutePoint[] = [];
  for (let i = 0; i < count; i++, offset += 16) {
    points.push(toPoint(view.getFloat64(offset, little), view.getFloat64(offset + 8, little)));
  }
  return points;
}

/**
 * PostgREST geography(LineString) alanını RoutePoint[]'e çevirir. GeoJSON nesnesi ya da hex (E)WKB
 * dizesi kabul edilir. Alan boşsa (null) [] döner; tanınmayan biçim ServiceError('invalid') fırlatır.
 */
export function parseLineString(value: unknown): RoutePoint[] {
  if (value === null || value === undefined) return [];
  if (typeof value === 'string') return fromHexWkb(value.trim());
  if (typeof value === 'object') return fromGeoJson(value as { type?: unknown; coordinates?: unknown });
  return fail();
}

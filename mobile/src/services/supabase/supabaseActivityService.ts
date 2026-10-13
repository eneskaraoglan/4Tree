import type { Activity, RoutePoint } from '@/types';

import type { ActivityService } from '../ActivityService';
import { hasForbiddenChar } from '../privacyZoneRules';
import { parseLineString } from './supabaseGeography';
import { computePace, guard, requireUserId, serviceError, throwIfError } from './supabaseHelpers';
import { supabase } from './supabaseClient';

const RUN_COLUMNS = 'id, type, distance_meters, duration_secs, seeds_earned, started_at, place, route';

/** Liste ekranları son aktiviteleri gösterir; tüm geçmişi (rotalarıyla) çekmeyiz. */
const ACTIVITY_LIST_LIMIT = 30;
const MAX_ROUTE_POINTS = 2000;
const MAX_PLACE_LENGTH = 80;
/** Cihaz saati sapması payı: bundan fazla gelecekteki başlangıç zamanı reddedilir. */
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

type RunRow = {
  id: string;
  type: string | null;
  distance_meters: number | string | null;
  duration_secs: number | string | null;
  seeds_earned: number | string | null;
  started_at: string;
  place: string | null;
  /** geography(LineString): PostgREST GeoJSON nesnesi ya da hex (E)WKB dizesi döner (parseLineString ikisini de okur). */
  route: unknown;
};

type NewActivity = Parameters<ActivityService['saveActivity']>[0];

function parseRouteOrEmpty(row: RunRow): RoutePoint[] {
  try {
    return parseLineString(row.route);
  } catch (error) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn(`[supabase] runs.route okunamadı, boş rota kullanıldı (id: ${row.id})`, error);
    }
    return [];
  }
}

/**
 * `tolerateBadRoute`: liste çağrısında tek satırın bozuk rotası tüm listeyi düşürmesin diye o satır
 * route: [] ile gelir (geliştirmede uyarı). Tekil çağrılar (getActivity/saveActivity) fırlatmaya devam eder.
 */
function toActivity(row: RunRow, tolerateBadRoute = false): Activity {
  const distanceKm = Number(row.distance_meters ?? 0) / 1000;
  const durationSec = Number(row.duration_secs ?? 0);
  return {
    id: row.id,
    type: row.type === 'walk' ? 'walk' : 'run',
    distanceKm,
    durationSec,
    paceSecPerKm: computePace(distanceKm, durationSec),
    startedAt: row.started_at,
    place: row.place ?? '',
    route: tolerateBadRoute ? parseRouteOrEmpty(row) : parseLineString(row.route),
    // Sunucu seeds_earned'ı koşu başına floor(km / 20) yazar (backend notu: mock kümülatif sayar).
    treesEarned: Number(row.seeds_earned ?? 0),
  };
}

const isValidPoint = (p: RoutePoint): boolean =>
  Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;

type ValidActivity = { startedAt: string; place: string; route: RoutePoint[] };

/** Rota üst sınırı aşılırsa ilk ve son nokta korunarak eşit aralıklı örneklenir. */
function sampleRoute(route: RoutePoint[]): RoutePoint[] {
  if (route.length <= MAX_ROUTE_POINTS) return route;
  const last = route.length - 1;
  return Array.from({ length: MAX_ROUTE_POINTS }, (_, i) => route[Math.round((i * last) / (MAX_ROUTE_POINTS - 1))]);
}

/** Girişi doğrular; yazılacak normalize değerleri döner. Geçersizse ServiceError('invalid'). */
function validate(activity: NewActivity): ValidActivity {
  if (activity.type !== 'run' && activity.type !== 'walk') {
    throw serviceError('invalid', 'Aktivite türü geçersiz.');
  }
  // Sunucudaki hız kontrolü süre 1 sn iken devre dışı kaldığı için en az 2 sn istenir.
  if (!Number.isFinite(activity.durationSec) || Math.round(activity.durationSec) < 2) {
    throw serviceError('invalid', 'Aktivite süresi geçersiz.');
  }
  if (!Array.isArray(activity.route) || activity.route.length < 2 || !activity.route.every(isValidPoint)) {
    throw serviceError('invalid', 'Rota en az iki geçerli konum içermeli.');
  }
  const started = activity.startedAt === undefined ? new Date(Date.now()) : new Date(activity.startedAt);
  if (Number.isNaN(started.getTime())) throw serviceError('invalid', 'Başlangıç zamanı geçersiz.');
  if (started.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
    throw serviceError('invalid', 'Başlangıç zamanı gelecekte olamaz.');
  }
  const place = activity.place?.trim() ?? '';
  if ([...place].length > MAX_PLACE_LENGTH) {
    throw serviceError('invalid', `Yer adı en fazla ${MAX_PLACE_LENGTH} karakter olabilir.`);
  }
  if (hasForbiddenChar(place)) throw serviceError('invalid', 'Yer adında geçersiz karakter var.');
  return { startedAt: started.toISOString(), place, route: sampleRoute(activity.route) };
}

/** PostGIS geography için EWKT: 'SRID=4326;LINESTRING(lng lat, ...)'; koordinatlar 7 ondalık (~1 cm). */
const toLineStringWkt = (route: RoutePoint[]): string =>
  `SRID=4326;LINESTRING(${route.map((p) => `${p.lng.toFixed(7)} ${p.lat.toFixed(7)}`).join(', ')})`;

export function createSupabaseActivityService(): ActivityService {
  return {
    getActivities: () =>
      guard(async () => {
        const userId = await requireUserId();
        const { data, error } = await supabase
          .from('runs')
          .select(RUN_COLUMNS)
          .eq('user_id', userId)
          .order('started_at', { ascending: false })
          .limit(ACTIVITY_LIST_LIMIT);
        throwIfError(error);
        return ((data ?? []) as RunRow[]).map((row) => toActivity(row, true));
      }),

    getActivity: (id) =>
      guard(async () => {
        const userId = await requireUserId();
        const { data, error } = await supabase
          .from('runs')
          .select(RUN_COLUMNS)
          .eq('id', id)
          .eq('user_id', userId)
          .maybeSingle();
        // Biçimi bozuk kimlik: arayüz sözleşmesi gereği "bulunamadı" = null.
        if (error && (error as { code?: string }).code === '22P02') return null;
        throwIfError(error);
        return data ? toActivity(data as RunRow) : null;
      }),

    saveActivity: (newActivity) =>
      guard(async () => {
        const valid = validate(newActivity);
        const userId = await requireUserId();
        // distance_meters ve seeds_earned gönderilmez: sunucu tetikleyicileri rotadan hesaplar.
        const { data, error } = await supabase
          .from('runs')
          .insert({
            user_id: userId,
            type: newActivity.type,
            duration_secs: Math.round(newActivity.durationSec),
            started_at: valid.startedAt,
            place: valid.place,
            route: toLineStringWkt(valid.route),
          })
          .select(RUN_COLUMNS)
          .single();
        throwIfError(error);
        if (!data) throw serviceError('network');
        return toActivity(data as RunRow);
      }),
  };
}

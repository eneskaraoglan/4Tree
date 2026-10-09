/** Feed düzeninde kullanılan sabit boyutlar (dp). */
export const AVATAR_SIZE = 40;
/** Rota çiziminin yüksekliği; genişliği ekran genişliği - 2 x yan boşluktur. */
export const ROUTE_HEIGHT = 140;
export const ROUTE_STROKE = 2.25;

/** Rota arkasındaki kontur çizgileri: ince ve soluk, rota çizgisi üstte net kalır. */
export const CONTOUR_STROKE = 1;
export const CONTOUR_OPACITY = 0.5;

/** İskelet çubuk ölçüleri. */
export const SKELETON = {
  nameWidth: 96,
  nameHeight: 16,
  timeWidth: 64,
  timeHeight: 12,
  captionWidth: '72%',
  captionHeight: 16,
  summaryWidth: 120,
  summaryHeight: 24,
  posts: 2,
} as const;

/** Tepki butonu: ikon, "taş" zemin ve sıçrama ölçüleri. */
export const REACTION = {
  iconSize: 20,
  pebbleSize: 32,
  bounceScale: 1.3,
  bounceUpMs: 110,
  bounceDownMs: 170,
} as const;

/** Sekme altı çizgisinin kalınlığı. */
export const TAB_UNDERLINE = 2;

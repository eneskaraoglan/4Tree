/** Pul en/boy oranı (yükseklik = genişlik x oran). */
export const STAMP_ASPECT = 1.55;

export type StampMetrics = {
  width: number;
  height: number;
  /** Kağıt kenar payı; baskı alanı (field) bu kadar içeriden başlar. */
  pad: number;
  fieldW: number;
  fieldH: number;
  /** Rozet adının üst kenarı (baskı alanının altı). */
  nameTop: number;
  /** Tarih damgasının çapı ve sol-üst köşesi (pulun sağ kenarından hafif taşar). */
  postmark: number;
  postmarkLeft: number;
  postmarkTop: number;
  /** Kazanılmış pulda ad genişliği (damgaya çarpmasın). */
  earnedNameWidth: number;
  /** Kilitli pulda ad altındaki ipucunun sığdığı satır sayısı (1-2). */
  hintLines: number;
  /** Tırtık yarıçapı ve tırtıklar arası adım. */
  notchR: number;
  pitch: number;
};

/** Ad satırı yüksekliği (typography.secondary) ve ipucu satırı (typography.small). */
const NAME_LINE = 20;
const HINT_LINE = 16;

export function stampMetrics(width: number): StampMetrics {
  const height = Math.round(width * STAMP_ASPECT);
  const pad = Math.round(width * 0.09);
  const fieldH = Math.round(height * 0.55);
  const notchR = Math.max(2.2, Math.round(width * 0.022 * 10) / 10);
  const nameTop = pad + fieldH + 8;
  const postmark = Math.round(width * 0.32);
  const overhang = Math.round(width * 0.03);
  const postmarkLeft = width - postmark + overhang;
  const hintRoom = height - pad / 2 - (nameTop + NAME_LINE * 2 + 2);
  return {
    width,
    height,
    pad,
    fieldW: width - pad * 2,
    fieldH,
    nameTop,
    postmark,
    postmarkLeft,
    postmarkTop: Math.round(nameTop + NAME_LINE - postmark / 2),
    earnedNameWidth: postmarkLeft - 4 - pad,
    hintLines: Math.max(1, Math.min(2, Math.floor(hintRoom / HINT_LINE))),
    notchR,
    pitch: notchR * 3.4,
  };
}

const fmt = (n: number) => Number(n.toFixed(2));

/**
 * Tırtıklı (perforated) dikdörtgen kontur. Saat yönünde ilerler; her tırtık içeri doğru yarım daire.
 * Tırtıklar kenarın hücre ortalarına oturur, köşeler düz kalır. Arc sweep her kenarda 0 (kenar yönüne göre içeri bombe).
 */
export function perforatedPath(w: number, h: number, r: number, pitch: number): string {
  const nx = Math.max(2, Math.round(w / pitch));
  const ny = Math.max(2, Math.round(h / pitch));
  const px = w / nx;
  const py = h / ny;
  const arc = (x: number, y: number) => `A${fmt(r)} ${fmt(r)} 0 0 0 ${fmt(x)} ${fmt(y)}`;
  const d: string[] = ['M0 0'];
  for (let i = 0; i < nx; i += 1) {
    const c = (i + 0.5) * px;
    d.push(`L${fmt(c - r)} 0`, arc(c + r, 0));
  }
  d.push(`L${fmt(w)} 0`);
  for (let i = 0; i < ny; i += 1) {
    const c = (i + 0.5) * py;
    d.push(`L${fmt(w)} ${fmt(c - r)}`, arc(w, c + r));
  }
  d.push(`L${fmt(w)} ${fmt(h)}`);
  for (let i = nx - 1; i >= 0; i -= 1) {
    const c = (i + 0.5) * px;
    d.push(`L${fmt(c + r)} ${fmt(h)}`, arc(c - r, h));
  }
  d.push(`L0 ${fmt(h)}`);
  for (let i = ny - 1; i >= 0; i -= 1) {
    const c = (i + 0.5) * py;
    d.push(`L0 ${fmt(c + r)}`, arc(0, c - r));
  }
  d.push('Z');
  return d.join(' ');
}

/** Rozet id'sinden deterministik eğim: işareti rastgele, büyüklüğü 1 ile 3 derece arası. */
export function stampTilt(id: string): number {
  let hash = 5381;
  for (let i = 0; i < id.length; i += 1) {
    hash = ((hash * 33) ^ id.charCodeAt(i)) >>> 0;
  }
  const magnitude = 1 + (((hash >>> 3) % 1000) / 1000) * 2;
  return (hash & 1 ? 1 : -1) * Math.round(magnitude * 100) / 100;
}

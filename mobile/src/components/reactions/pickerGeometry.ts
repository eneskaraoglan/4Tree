import { PICKER } from './layout';

/** Hapın kenarından ilk seçeneğe kadar: iç boşluk + çizgi. */
const INSET = PICKER.padding + PICKER.borderWidth;

/** Düğmenin pencere içindeki konumu (`measureInWindow`). */
export type Anchor = { x: number; y: number; width: number; height: number };
export type PickerFrame = { left: number; top: number; width: number; height: number };

/** Ölçüm gelmediğinde (ilk kare, test) hapın göreceli olarak makul bir yere düşmesi için. */
export function fallbackAnchor(windowHeight: number): Anchor {
  return { x: PICKER.edge, y: Math.round(windowHeight / 2), width: PICKER.item, height: PICKER.item };
}

/**
 * Hapın pencere içindeki dikdörtgeni: düğmenin üstünde, sol kenarı düğmeyle hizalı ve ekrana sığacak
 * şekilde kaydırılmış. Üstte yer yoksa düğmenin altına açılır.
 */
export function pickerFrame(anchor: Anchor, count: number, windowWidth: number): PickerFrame {
  const width = count * PICKER.item + 2 * INSET;
  const height = PICKER.item + 2 * INSET;
  const maxLeft = Math.max(PICKER.edge, windowWidth - width - PICKER.edge);
  const left = Math.min(Math.max(anchor.x, PICKER.edge), maxLeft);
  const above = anchor.y - PICKER.gap - height;
  const top = above >= PICKER.minTop ? above : anchor.y + anchor.height + PICKER.gap;
  return { left, top, width, height };
}

/** Parmağın (pageX, pageY) üstünde durduğu seçeneğin sırası; hapın dışındaysa null. */
export function reactionIndexAt(frame: PickerFrame, count: number, pageX: number, pageY: number): number | null {
  if (pageY < frame.top - PICKER.hoverSlopY || pageY > frame.top + frame.height + PICKER.hoverSlopY) return null;
  const x = pageX - frame.left - INSET;
  if (x < 0 || x >= count * PICKER.item) return null;
  return Math.floor(x / PICKER.item);
}

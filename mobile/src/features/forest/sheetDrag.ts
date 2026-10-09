/** Aşağı kaydırma bırakılınca sheet kapansın mı: yeterince uzağa çekildi ya da hızlı fırlatıldı. */
export const DISMISS_DISTANCE = 110;
export const DISMISS_VELOCITY = 0.9;
/** Sürükleme, dikey hareket bu kadar piksel aşınca sahiplenilir. */
export const DRAG_START_PX = 6;

export function shouldDismissDrag(dy: number, vy: number): boolean {
  return dy > DISMISS_DISTANCE || (dy > 24 && vy > DISMISS_VELOCITY);
}

type Gesture = { dx: number; dy: number; vy: number };

type DragConfigOptions = {
  /** Kapanış başladıysa sürükleme sahiplenilmez. */
  closing: boolean;
  setDrag: (dy: number) => void;
  snapBack: () => void;
  onClose: () => void;
};

/** PanResponder geri çağrıları. Saf tutulur ki hareket kararı animasyon kütüphanesi olmadan test edilebilsin. */
export function createDragConfig({ closing, setDrag, snapBack, onClose }: DragConfigOptions) {
  return {
    onMoveShouldSetPanResponder: (_event: unknown, g: Pick<Gesture, 'dx' | 'dy'>) =>
      !closing && g.dy > DRAG_START_PX && g.dy > Math.abs(g.dx),
    onPanResponderMove: (_event: unknown, g: Pick<Gesture, 'dy'>) => setDrag(Math.max(0, g.dy)),
    onPanResponderRelease: (_event: unknown, g: Pick<Gesture, 'dy' | 'vy'>) => {
      if (shouldDismissDrag(g.dy, g.vy)) onClose();
      else snapBack();
    },
    onPanResponderTerminate: () => snapBack(),
  };
}

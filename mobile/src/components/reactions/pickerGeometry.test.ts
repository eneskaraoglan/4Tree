import { PICKER } from './layout';
import { fallbackAnchor, pickerFrame, reactionIndexAt } from './pickerGeometry';

const INSET = PICKER.padding + PICKER.borderWidth;

describe('pickerFrame', () => {
  const anchor = { x: 40, y: 400, width: 120, height: 44 };

  it('düğmenin üstünde, sol kenarı hizalı; genişlik seçenek sayısına göre', () => {
    const frame = pickerFrame(anchor, 5, 390);
    expect(frame.width).toBe(5 * PICKER.item + 2 * INSET);
    expect(frame.left).toBe(40);
    expect(frame.top + frame.height + PICKER.gap).toBe(anchor.y);
    expect(pickerFrame(anchor, 2, 390).width).toBe(2 * PICKER.item + 2 * INSET);
  });

  it('ekrana sığmıyorsa sola kaydırır; kenarlardan taşmaz', () => {
    const right = pickerFrame({ ...anchor, x: 360 }, 5, 390);
    expect(right.left + right.width).toBe(390 - PICKER.edge);
    expect(pickerFrame({ ...anchor, x: -30 }, 5, 390).left).toBe(PICKER.edge);
  });

  it('üstte yer yoksa düğmenin altına açılır', () => {
    const frame = pickerFrame({ ...anchor, y: 60 }, 5, 390);
    expect(frame.top).toBe(60 + anchor.height + PICKER.gap);
  });

  it('fallbackAnchor ekranın ortasında ve 44 dp', () => {
    expect(fallbackAnchor(800)).toMatchObject({ y: 400, width: 44, height: 44 });
  });
});

describe('reactionIndexAt', () => {
  const frame = { left: 20, top: 300, width: 5 * PICKER.item + 2 * INSET, height: PICKER.item + 2 * INSET };
  const midY = frame.top + frame.height / 2;

  it('x konumuna göre seçeneğin sırasını verir', () => {
    expect(reactionIndexAt(frame, 5, frame.left + INSET + 1, midY)).toBe(0);
    expect(reactionIndexAt(frame, 5, frame.left + INSET + PICKER.item + 1, midY)).toBe(1);
    expect(reactionIndexAt(frame, 5, frame.left + INSET + 5 * PICKER.item - 1, midY)).toBe(4);
  });

  it('hapın yanında ya da çok uzağında null', () => {
    expect(reactionIndexAt(frame, 5, frame.left + 1, midY)).toBeNull();
    expect(reactionIndexAt(frame, 5, frame.left + frame.width, midY)).toBeNull();
    expect(reactionIndexAt(frame, 5, frame.left + INSET + 5, frame.top - PICKER.hoverSlopY - 1)).toBeNull();
    expect(reactionIndexAt(frame, 5, frame.left + INSET + 5, frame.top + frame.height + PICKER.hoverSlopY + 1)).toBeNull();
  });

  it('dikeyde biraz sapma (parmak yukarı kayması) izlemeyi bozmaz', () => {
    expect(reactionIndexAt(frame, 5, frame.left + INSET + 5, frame.top - PICKER.hoverSlopY + 1)).toBe(0);
  });
});

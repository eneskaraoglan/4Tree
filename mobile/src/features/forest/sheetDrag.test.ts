import { createDragConfig, shouldDismissDrag } from './sheetDrag';

describe('shouldDismissDrag', () => {
  it('yeterince uzağa çekilince kapatır', () => {
    expect(shouldDismissDrag(140, 0.1)).toBe(true);
  });

  it('kısa ve yavaş çekişte geri döner', () => {
    expect(shouldDismissDrag(60, 0.2)).toBe(false);
  });

  it('kısa ama hızlı fırlatmada kapatır', () => {
    expect(shouldDismissDrag(50, 1.4)).toBe(true);
  });

  it('yukarı çekişte kapatmaz', () => {
    expect(shouldDismissDrag(-80, -2)).toBe(false);
  });
});

describe('createDragConfig', () => {
  const make = (closing = false) => {
    const setDrag = jest.fn();
    const snapBack = jest.fn();
    const onClose = jest.fn();
    return { setDrag, snapBack, onClose, config: createDragConfig({ closing, setDrag, snapBack, onClose }) };
  };

  it('sadece aşağı doğru baskın dikey harekette sahiplenir', () => {
    const { config } = make();
    expect(config.onMoveShouldSetPanResponder(null, { dx: 2, dy: 20 })).toBe(true);
    expect(config.onMoveShouldSetPanResponder(null, { dx: 2, dy: 3 })).toBe(false);
    expect(config.onMoveShouldSetPanResponder(null, { dx: 40, dy: 20 })).toBe(false);
    expect(config.onMoveShouldSetPanResponder(null, { dx: 0, dy: -30 })).toBe(false);
  });

  it('kapanış başladıysa sahiplenmez', () => {
    const { config } = make(true);
    expect(config.onMoveShouldSetPanResponder(null, { dx: 0, dy: 80 })).toBe(false);
  });

  it('sürüklerken sheet`i yukarı çıkarmaz', () => {
    const { config, setDrag } = make();
    config.onPanResponderMove(null, { dy: 45 });
    config.onPanResponderMove(null, { dy: -20 });
    expect(setDrag).toHaveBeenNthCalledWith(1, 45);
    expect(setDrag).toHaveBeenNthCalledWith(2, 0);
  });

  it('bırakınca uzaksa kapatır, değilse yerine döner', () => {
    const far = make();
    far.config.onPanResponderRelease(null, { dy: 200, vy: 0.1 });
    expect(far.onClose).toHaveBeenCalledTimes(1);
    expect(far.snapBack).not.toHaveBeenCalled();

    const near = make();
    near.config.onPanResponderRelease(null, { dy: 40, vy: 0.1 });
    expect(near.onClose).not.toHaveBeenCalled();
    expect(near.snapBack).toHaveBeenCalledTimes(1);
  });

  it('jest iptal ederse yerine döner', () => {
    const { config, snapBack, onClose } = make();
    config.onPanResponderTerminate();
    expect(snapBack).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});

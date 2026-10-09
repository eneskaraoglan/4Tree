import { render, screen } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import { fitRoutePoints, RouteLine } from './RouteLine';

/** Render ağacında verilen host tipinden kaç öğe var. */
function countHost(node: unknown, type: string): number {
  if (!node || typeof node === 'string') return 0;
  if (Array.isArray(node)) return node.reduce((sum: number, child) => sum + countHost(child, type), 0);
  const json = node as ReactTestRendererJSON;
  return (json.type === type ? 1 : 0) + countHost(json.children, type);
}

/** Render ağacındaki verilen host tipindeki öğeleri sırayla toplar. */
function findHost(node: unknown, type: string): ReactTestRendererJSON[] {
  if (!node || typeof node === 'string') return [];
  if (Array.isArray(node)) return node.flatMap((child) => findHost(child, type));
  const json = node as ReactTestRendererJSON;
  return [...(json.type === type ? [json] : []), ...findHost(json.children, type)];
}

const square = [
  { lat: 41.0, lng: 29.0 },
  { lat: 41.0, lng: 29.01 },
  { lat: 41.01, lng: 29.01 },
  { lat: 41.01, lng: 29.0 },
];

describe('fitRoutePoints', () => {
  it('2 noktadan azsa ve geçersiz boyutta boş döner', () => {
    expect(fitRoutePoints([], 100, 50, 4)).toEqual([]);
    expect(fitRoutePoints([{ lat: 41, lng: 29 }], 100, 50, 4)).toEqual([]);
    expect(fitRoutePoints(square, 0, 50, 4)).toEqual([]);
    expect(fitRoutePoints(square, 100, -1, 4)).toEqual([]);
  });

  it('NaN içeren noktaları atar', () => {
    const points = [{ lat: Number.NaN, lng: 29 }, ...square.slice(0, 2)];
    expect(fitRoutePoints(points, 100, 50, 4)).toHaveLength(2);
  });

  it('tüm noktalar kutu ve padding sınırları içinde kalır (geniş, uzun, küçük)', () => {
    for (const [w, h] of [[300, 40], [40, 300], [72, 56], [8, 8]] as const) {
      const padding = 3;
      const fitted = fitRoutePoints(square, w, h, padding);
      const pad = Math.min(padding, Math.min(w, h) / 2 - 0.5);
      expect(fitted).toHaveLength(4);
      fitted.forEach(({ x, y }) => {
        expect(x).toBeGreaterThanOrEqual(pad - 1e-9);
        expect(x).toBeLessThanOrEqual(w - pad + 1e-9);
        expect(y).toBeGreaterThanOrEqual(pad - 1e-9);
        expect(y).toBeLessThanOrEqual(h - pad + 1e-9);
      });
    }
  });

  it('oranı korur: boylam cos(enlem) ile ölçeklenir', () => {
    // 60° enlemde 1° boylam, 1° enlemin yarısı kadar yer kaplar.
    const fitted = fitRoutePoints(
      [
        { lat: 60, lng: 10 },
        { lat: 61, lng: 11 },
      ],
      200,
      200,
      0,
    );
    const dx = Math.abs(fitted[1].x - fitted[0].x);
    const dy = Math.abs(fitted[1].y - fitted[0].y);
    expect(dx / dy).toBeCloseTo(Math.cos((60.5 * Math.PI) / 180), 2);
  });

  it('kuzey yukarıda, çizim kutuda ortalanır', () => {
    const fitted = fitRoutePoints(
      [
        { lat: 41, lng: 29 },
        { lat: 41.01, lng: 29 },
      ],
      100,
      100,
      10,
    );
    expect(fitted[1].y).toBeLessThan(fitted[0].y);
    expect(fitted[0].x).toBeCloseTo(50);
  });

  it('hepsi aynı noktaysa merkeze koyar', () => {
    const same = { lat: 41, lng: 29 };
    const fitted = fitRoutePoints([same, same], 80, 40, 4);
    expect(fitted[0]).toEqual({ x: 40, y: 20 });
  });
});

describe('RouteLine', () => {
  it('showEndpoints açıkken başlangıç noktası ve bitiş halkası (2 daire), kapalıyken daire yok', async () => {
    await render(<RouteLine points={square} width={120} height={60} />);
    expect(countHost(screen.toJSON(), 'RNSVGPath')).toBe(1);
    expect(countHost(screen.toJSON(), 'RNSVGCircle')).toBe(2);

    await render(<RouteLine points={square} width={120} height={60} showEndpoints={false} />);
    expect(countHost(screen.toJSON(), 'RNSVGPath')).toBe(1);
    expect(countHost(screen.toJSON(), 'RNSVGCircle')).toBe(0);
  });

  it('başlangıç noktası ilk, bitiş halkası son noktanın koordinatına konur', async () => {
    const width = 120;
    const height = 60;
    // Varsayılan padding: strokeWidth 2, uç halkası dahil.
    const fitted = fitRoutePoints(square, width, height, 2 * 2.4 + 1);
    await render(<RouteLine points={square} width={width} height={height} />);
    const [start, end] = findHost(screen.toJSON(), 'RNSVGCircle');
    const first = fitted[0];
    const last = fitted[fitted.length - 1];
    expect(Number(start.props.cx)).toBeCloseTo(first.x);
    expect(Number(start.props.cy)).toBeCloseTo(first.y);
    expect(Number(end.props.cx)).toBeCloseTo(last.x);
    expect(Number(end.props.cy)).toBeCloseTo(last.y);
    expect(start.props.cy).not.toEqual(end.props.cy);
  });

  it('boş ve tek nokta güvenle boş çizim verir', async () => {
    await render(<RouteLine points={[]} width={120} height={60} testID="empty" />);
    expect(countHost(screen.toJSON(), 'RNSVGPath')).toBe(0);
    expect(countHost(screen.toJSON(), 'RNSVGCircle')).toBe(0);

    await render(<RouteLine points={[square[0]]} width={120} height={60} testID="single" />);
    expect(countHost(screen.toJSON(), 'RNSVGPath')).toBe(0);
  });

  it('varsayılan olarak dekoratiftir (ekran okuyucudan gizli)', async () => {
    await render(<RouteLine points={square} width={120} height={60} testID="route" />);
    expect(screen.queryByTestId('route')).toBeNull();
    expect(screen.getByTestId('route', { includeHiddenElements: true }).props.accessibilityElementsHidden).toBe(true);
  });

  it('accessibilityLabel verilirse erişilebilir görsel olur', async () => {
    await render(<RouteLine points={square} width={120} height={60} accessibilityLabel="Rota çizimi" />);
    expect(screen.getByRole('image', { name: 'Rota çizimi' })).toBeTruthy();
  });

  it('negatif ya da sıfır boyutta çökmez', async () => {
    await render(<RouteLine points={square} width={0} height={-5} testID="zero" />);
    expect(screen.getByTestId('zero', { includeHiddenElements: true })).toBeTruthy();
  });
});

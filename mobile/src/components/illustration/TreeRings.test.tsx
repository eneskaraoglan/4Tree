import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { RING_INTRO_MS, TreeRings } from '@/components/illustration';

import { buildRingsGeometry, tipPosition } from './ringGeometry';
import { getMotionCalls, resetMotionCalls, setReducedMotion } from './reanimatedTestMock';

jest.mock('react-native-reanimated', () => jest.requireActual('./reanimatedTestMock').createReanimatedMock());

beforeEach(() => {
  setReducedMotion(false);
  resetMotionCalls();
});

async function progressNow(progress: number) {
  await render(<TreeRings progress={progress} size={240} accessibilityLabel="Ağaç halkası" />);
  return screen.getByRole('progressbar', { name: 'Ağaç halkası' }).props.accessibilityValue.now;
}

describe('TreeRings', () => {
  it('çökmeden render olur ve erişilebilirlik etiketi taşır', async () => {
    await render(<TreeRings progress={0.38} size={240} accessibilityLabel="Ağacının yüzde 38'i" />);

    expect(screen.getByLabelText("Ağacının yüzde 38'i")).toBeTruthy();
  });

  it('progress sınırlarını kırpar: 0, 0.38, 1 ve aralık dışı değerler', async () => {
    expect(await progressNow(0)).toBe(0);
    expect(await progressNow(0.38)).toBe(38);
    expect(await progressNow(1)).toBe(100);
    expect(await progressNow(-3)).toBe(0);
    expect(await progressNow(2.5)).toBe(100);
    expect(await progressNow(Number.NaN)).toBe(0);
  });

  it('merkez boşluğa children koyar', async () => {
    await render(
      <TreeRings progress={0.5} size={240}>
        <Text>12,4 km</Text>
      </TreeRings>,
    );

    expect(screen.getByText('12,4 km')).toBeTruthy();
  });

  it('açılış animasyonu en fazla 900 ms', () => {
    expect(RING_INTRO_MS).toBeLessThanOrEqual(900);
  });

  it('animasyon açıkken animasyonlu yol kullanılır (testin duyarlılığı)', async () => {
    await render(<TreeRings progress={0.7} size={200} accessibilityLabel="a" />);

    expect(getMotionCalls().animatedProps).toBeGreaterThan(0);
    expect(getMotionCalls().timing).toBeGreaterThan(0);
  });

  it('animated=false ve Reduce Motion açıkken animasyonlu yol hiç kullanılmaz', async () => {
    await render(<TreeRings progress={0.7} size={200} animated={false} accessibilityLabel="a" />);
    expect(screen.getByLabelText('a')).toBeTruthy();
    expect(getMotionCalls()).toEqual({ animatedProps: 0, timing: 0, repeat: 0, sequence: 0 });

    setReducedMotion(true);
    await render(<TreeRings progress={0.7} size={200} accessibilityLabel="b" />);
    expect(screen.getByLabelText('b')).toBeTruthy();
    expect(getMotionCalls()).toEqual({ animatedProps: 0, timing: 0, repeat: 0, sequence: 0 });
  });
});

describe('ağaç halkası geometrisi', () => {
  const params = { count: 9, holeRatio: 0.46, seed: 4 };

  it('aynı tohum her seferinde aynı halkaları verir, farklı tohum farklı', () => {
    expect(buildRingsGeometry(params)).toEqual(buildRingsGeometry(params));
    expect(buildRingsGeometry({ ...params, seed: 5 }).rings[3].d).not.toBe(buildRingsGeometry(params).rings[3].d);
  });

  it('halkalar içten dışa, merkez boşluğunun dışında ve viewBox içinde kalır', () => {
    const { rings, holeRadius } = buildRingsGeometry(params);
    expect(rings).toHaveLength(9);
    const radiusOf = (points: number[]) => {
      let sum = 0;
      for (let i = 0; i < points.length; i += 2) sum += Math.hypot(points[i] - 50, points[i + 1] - 50);
      return sum / (points.length / 2);
    };
    const radii = rings.map((r) => radiusOf(r.points));
    expect(radii[0]).toBeGreaterThan(holeRadius);
    radii.forEach((r, i) => {
      if (i > 0) expect(r).toBeGreaterThan(radii[i - 1]);
      expect(r).toBeLessThan(50);
    });
  });

  it('ilerleme ucu: 0 iken yok, 1 iken en dış halkanın başlangıcında (saat 12)', () => {
    const { table, samples } = buildRingsGeometry(params);
    expect(tipPosition(table, samples, 9, 0)).toBeNull();
    const end = tipPosition(table, samples, 9, 1);
    expect(end).not.toBeNull();
    expect(end![0]).toBeCloseTo(50, 0);
    expect(end![1]).toBeLessThan(15);
  });

  it('halka aralıkları ve çizgi kalınlıkları değişkendir; bazı soluk halkalarda kopukluk var', () => {
    const { rings } = buildRingsGeometry(params);
    const radiusOf = (points: number[]) => {
      let sum = 0;
      for (let i = 0; i < points.length; i += 2) sum += Math.hypot(points[i] - 50, points[i + 1] - 50);
      return sum / (points.length / 2);
    };
    const radii = rings.map((r) => radiusOf(r.points));
    const gaps = radii.slice(1).map((r, i) => r - radii[i]);
    expect(Math.max(...gaps) / Math.min(...gaps)).toBeGreaterThan(1.8);

    const widths = rings.map((r) => r.strokeWidth);
    expect(Math.max(...widths) / Math.min(...widths)).toBeGreaterThan(1.8);
    expect(rings.some((r) => r.gap != null)).toBe(true);
    expect(rings.some((r) => r.gap == null)).toBe(true);
  });

  it('kabuk dokusu ve radyal çatlak üretilir', () => {
    const { bark, crack } = buildRingsGeometry(params);
    expect(bark.split('M').length).toBeGreaterThan(20);
    expect(crack.startsWith('M')).toBe(true);
    expect(crack.split('M').length).toBe(4);
  });
});

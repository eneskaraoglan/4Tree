import { render, screen } from '@testing-library/react-native';

import { ForestScene, TreeRings } from '@/components/illustration';

jest.mock('react-native-reanimated', () => jest.requireActual('./reanimatedTestMock').createReanimatedMock());

// Gradient kimliklerini görmek için svg bileşenleri düz host elemanlara çevrilir.
jest.mock('react-native-svg', () => {
  const { createElement } = jest.requireActual('react');
  const out: Record<string, unknown> = { __esModule: true };
  for (const name of ['Svg', 'Path', 'Circle', 'Ellipse', 'Rect', 'Defs', 'LinearGradient', 'RadialGradient', 'Stop']) {
    out[name] = (props: Record<string, unknown>) => createElement(`svg-${name}`, props, props.children);
  }
  out.default = out.Svg;
  return out;
});

type Json = { type: string; props: Record<string, unknown>; children?: Json[] | null } | string;

function walk(node: Json | Json[] | null, visit: (n: Exclude<Json, string>) => void) {
  if (node == null || typeof node === 'string') return;
  if (Array.isArray(node)) return node.forEach((n) => walk(n, visit));
  visit(node);
  node.children?.forEach((c) => walk(c, visit));
}

describe('gradient kimlikleri', () => {
  it('iki ForestScene ve iki TreeRings birlikte render edilince kimlikler benzersiz, url(#) referansları çözülür', async () => {
    const trees: { id: string; species: 'cam'; seed: number }[] = [];
    await render(
      <>
        <ForestScene trees={[]} height={300} />
        <ForestScene trees={trees} height={300} />
        <ForestScene trees={[{ id: 'a', species: 'cam', seed: 1 }]} height={300} />
        <TreeRings progress={0.4} size={200} />
        <TreeRings progress={0.8} size={200} />
      </>,
    );

    const ids: string[] = [];
    const refs: string[] = [];
    walk(screen.toJSON() as unknown as Json[], (node) => {
      if (node.type === 'svg-LinearGradient' || node.type === 'svg-RadialGradient') ids.push(String(node.props.id));
      const fill = node.props.fill;
      if (typeof fill === 'string' && fill.startsWith('url(#')) refs.push(fill.slice(5, -1));
    });

    expect(ids.length).toBeGreaterThanOrEqual(2 * 4 + 1);
    expect(new Set(ids).size).toBe(ids.length);
    for (const ref of refs) expect(ids).toContain(ref);
  });
});

import { render, screen } from '@testing-library/react-native';

import { postAvatarGeometry } from './PostAvatar';
import { contourPaths, RouteContours } from './RouteContours';

describe('contourPaths', () => {
  it('3-4 kapalı eğri üretir ve aynı id için aynı çizimi verir', () => {
    for (const id of ['post-001', 'post-002', 'post-003', 'post-004', 'post-005']) {
      const paths = contourPaths(id, 350, 140);
      expect(paths.length).toBeGreaterThanOrEqual(3);
      expect(paths.length).toBeLessThanOrEqual(4);
      expect(paths.every((d) => d.startsWith('M') && d.endsWith('Z'))).toBe(true);
    }
    expect(contourPaths('post-001', 350, 140)).toEqual(contourPaths('post-001', 350, 140));
    expect(contourPaths('post-001', 350, 140)).not.toEqual(contourPaths('post-002', 350, 140));
  });

  it('geçersiz boyutta boş döner', () => {
    expect(contourPaths('post-001', 0, 140)).toEqual([]);
    expect(contourPaths('post-001', 350, Number.NaN)).toEqual([]);
  });
});

describe('RouteContours', () => {
  it('ekran okuyucudan gizli, ince ve soluk çizgiler çizer', async () => {
    await render(<RouteContours postId="post-001" width={350} height={140} />);
    const group = screen.getByTestId('route-contours', { includeHiddenElements: true });
    expect(group.props.accessibilityElementsHidden).toBe(true);
    const lines = screen.getAllByTestId('route-contour', { includeHiddenElements: true });
    expect(lines.length).toBeGreaterThanOrEqual(3);
    expect(lines[0].props.strokeWidth).toBe(1);
    expect(lines[0].props.strokeOpacity).toBe(0.5);
  });

  it('genişlik 0 ise hiçbir şey çizmez', async () => {
    await render(<RouteContours postId="post-001" width={0} height={140} />);
    expect(screen.queryByTestId('route-contours', { includeHiddenElements: true })).toBeNull();
  });
});

describe('postAvatarGeometry', () => {
  it('aynı addan aynı biçim ve renk üretir; renk parlak yeşil olmaz', () => {
    expect(postAvatarGeometry('Elif', 40)).toEqual(postAvatarGeometry('elif', 40));
    for (const name of ['Elif', 'Mert', 'Zeynep', 'Can', 'Defne', 'Selin', 'Barış', 'Ece']) {
      const { fill, path } = postAvatarGeometry(name, 40);
      expect(fill).not.toBe('#8DBF6A');
      expect(path.startsWith('M')).toBe(true);
    }
  });
});

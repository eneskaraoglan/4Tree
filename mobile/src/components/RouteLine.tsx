import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/theme';

export type RouteLinePoint = { lat: number; lng: number };

export type RouteLineProps = {
  /** Rota noktaları (enlem/boylam, derece). 2'den azsa boş çizim yapılır. */
  points: RouteLinePoint[];
  width: number;
  height: number;
  /** Çizgi kalınlığı (dp). Varsayılan 2. */
  strokeWidth?: number;
  /** Çizgi rengi. Varsayılan textSecondary. */
  color?: string;
  /** Başlangıçta dolu nokta, bitişte halka. Varsayılan true. */
  showEndpoints?: boolean;
  /** Kutu kenarından iç boşluk (dp). Verilmezse çizgi ve uç işaretleri kırpılmayacak kadar bırakılır. */
  padding?: number;
  /** Verilirse çizim erişilebilir bir görsel olur; verilmezse ekran okuyucudan gizlenir (dekoratif). */
  accessibilityLabel?: string;
  testID?: string;
};

const DEFAULT_STROKE = 2;
/** Uç işaretlerinin yarıçapı, çizgi kalınlığının katı. */
const START_DOT_RATIO = 1.5;
const END_RING_RATIO = 2.4;

type Point = { x: number; y: number };

/**
 * Noktaları kutuya oranı bozmadan sığdırır. Boylam derecesi cos(enlem) ile ölçeklenir,
 * böylece rota gerçek biçimini korur. Sonuç [padding, boyut - padding] aralığındadır ve ortalanır.
 */
export function fitRoutePoints(points: RouteLinePoint[], width: number, height: number, padding: number): Point[] {
  const valid = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (valid.length < 2 || !(width > 0) || !(height > 0)) return [];

  const meanLat = valid.reduce((sum, p) => sum + p.lat, 0) / valid.length;
  const lngScale = Math.cos((meanLat * Math.PI) / 180);
  // Kuzey yukarıda: y ekseni ters çevrilir.
  const projected = valid.map((p) => ({ x: p.lng * lngScale, y: -p.lat }));

  const xs = projected.map((p) => p.x);
  const ys = projected.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX;
  const spanY = Math.max(...ys) - minY;

  // Kutu paddingle birlikte çok küçükse en az 1 dp çizim alanı kalır.
  const pad = Math.min(Math.max(0, padding), Math.min(width, height) / 2 - 0.5);
  const availW = Math.max(0, width - 2 * pad);
  const availH = Math.max(0, height - 2 * pad);

  const scaleX = spanX > 0 ? availW / spanX : Infinity;
  const scaleY = spanY > 0 ? availH / spanY : Infinity;
  const scale = Math.min(scaleX, scaleY);
  // Tüm noktalar aynı yerdeyse ölçek anlamsızdır; hepsi merkeze düşer.
  const safeScale = Number.isFinite(scale) ? scale : 0;

  const offsetX = pad + (availW - spanX * safeScale) / 2;
  const offsetY = pad + (availH - spanY * safeScale) / 2;

  return projected.map((p) => ({
    x: offsetX + (p.x - minX) * safeScale,
    y: offsetY + (p.y - minY) * safeScale,
  }));
}

const fmt = (n: number) => Math.round(n * 100) / 100;

function RouteLineBase({
  points,
  width,
  height,
  strokeWidth = DEFAULT_STROKE,
  color = colors.textSecondary,
  showEndpoints = true,
  padding,
  accessibilityLabel,
  testID,
}: RouteLineProps) {
  const effectivePadding = padding ?? (showEndpoints ? strokeWidth * END_RING_RATIO + strokeWidth / 2 : strokeWidth);
  const fitted = useMemo(
    () => fitRoutePoints(points, width, height, effectivePadding),
    [points, width, height, effectivePadding],
  );

  const accessibility = accessibilityLabel
    ? ({ accessible: true, accessibilityRole: 'image', accessibilityLabel } as const)
    : ({ accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const);

  const first = fitted[0];
  const last = fitted[fitted.length - 1];
  const d = fitted.map((p, i) => `${i === 0 ? 'M' : 'L'}${fmt(p.x)} ${fmt(p.y)}`).join(' ');

  return (
    <View style={[styles.box, { width: Math.max(0, width), height: Math.max(0, height) }]} testID={testID} {...accessibility}>
      {fitted.length > 0 && width > 0 && height > 0 ? (
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          {showEndpoints && first && last ? (
            <>
              <Circle cx={first.x} cy={first.y} r={strokeWidth * START_DOT_RATIO} fill={color} />
              <Circle
                cx={last.x}
                cy={last.y}
                r={strokeWidth * END_RING_RATIO}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth * 0.75}
              />
            </>
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}

/** Rota çizimi: noktaları ince, yuvarlak uçlu bir çizgi olarak kutuya sığdırır. Küçük ve tam genişlikte kullanılır. */
export const RouteLine = memo(RouteLineBase);

const styles = StyleSheet.create({
  box: { overflow: 'hidden' },
});

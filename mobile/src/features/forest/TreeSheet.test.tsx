import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { setReducedMotion } from '@/components/illustration/reanimatedTestMock';
import { createMockServices } from '@/services';
import type { ForestTree } from '@/types';

import { formatPlantedDate } from './format';
import { TreeSheet } from './TreeSheet';

jest.mock('react-native-reanimated', () => jest.requireActual('./testMocks').createSheetReanimatedMock());
jest.mock('react-native-worklets', () => jest.requireActual('./testMocks').createWorkletsMock());

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

async function makeTree(overrides: Partial<ForestTree> = {}): Promise<ForestTree> {
  const [first] = await createMockServices().forest.getTrees();
  return { ...first, sponsor: undefined, ...overrides };
}

async function renderSheet(tree: ForestTree, onDismiss = jest.fn()) {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <TreeSheet tree={tree} onDismiss={onDismiss} />
    </SafeAreaProvider>,
  );
  return onDismiss;
}

afterEach(() => setReducedMotion(false));

describe('TreeSheet', () => {
  it('türü, bölgeyi (tek yerde), tarih ve sertifika satırını ve tek "Örnek" etiketini gösterir', async () => {
    const tree = await makeTree({ plantedAt: '2026-10-12T12:00:00Z', certificateNo: 'ORNEK-2026-0004', region: 'Bolu' });
    await renderSheet(tree);

    expect(screen.getByRole('header', { name: tree.species })).toBeTruthy();
    expect(screen.getAllByText('Bolu')).toHaveLength(1);
    expect(screen.getByText(`${formatPlantedDate(tree.plantedAt)} · Sertifika no ORNEK-2026-0004`)).toBeTruthy();
    expect(screen.getAllByText(/Örnek/).filter((n) => n.props.children === 'Örnek sertifika')).toHaveLength(1);
    expect(screen.queryByText(/Bu ağacın dikimini/)).toBeNull();
  });

  it('sponsor varsa düz cümleyle gösterir', async () => {
    await renderSheet(await makeTree({ sponsor: 'Örnek Kahve Evi' }));

    expect(screen.getByText('Bu ağacın dikimini Örnek Kahve Evi üstlendi')).toBeTruthy();
  });

  it('tarih okunamazsa satırda sadece sertifika no yazar', async () => {
    await renderSheet(await makeTree({ plantedAt: 'bozuk', certificateNo: 'ORNEK-2026-0009' }));

    expect(screen.getByText('Sertifika no ORNEK-2026-0009')).toBeTruthy();
  });

  it('ekran okuyucu için modal işaretlidir ve kaçış hareketiyle kapanır', async () => {
    const onDismiss = await renderSheet(await makeTree());

    const sheet = screen.root?.queryAll((node) => node.props.accessibilityViewIsModal === true && node.props.onAccessibilityEscape)[0];
    expect(sheet).toBeTruthy();
    await act(async () => sheet?.props.onAccessibilityEscape());

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('Kapat düğmesi onDismiss`i tam bir kez çağırır (çift dokunuşta da)', async () => {
    const onDismiss = await renderSheet(await makeTree());

    const close = screen.getByRole('button', { name: 'Kapat' });
    await fireEvent.press(close);
    await fireEvent.press(close);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('arka plan dokunuşu ve geri tuşu da bir kez kapatır; Hareketi azalt açıkken de', async () => {
    setReducedMotion(true);
    const onDismiss = await renderSheet(await makeTree());

    await fireEvent.press(screen.getByTestId('sheet-backdrop', { includeHiddenElements: true }));
    await act(async () => {
      screen.root?.queryAll((node) => node.type === 'Modal')[0]?.props.onRequestClose();
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('Modal, gezinme çubuğunun altına da uzanır (edge-to-edge)', async () => {
    await renderSheet(await makeTree());

    const modal = screen.root?.queryAll((node) => node.type === 'Modal')[0];
    expect(modal?.props.navigationBarTranslucent).toBe(true);
    expect(modal?.props.statusBarTranslucent).toBe(true);
  });
});

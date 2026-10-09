import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { setReducedMotion } from '@/components/illustration/reanimatedTestMock';
import { createMockServices, ServicesProvider, type Services } from '@/services';
import type { ForestTree } from '@/types';

import { formatCount, formatPlantedDate } from './format';
import { ForestScreen } from './ForestScreen';
import { estimateCo2Kg } from './impact';
import { summarizeRegions } from './regions';

jest.mock('react-native-reanimated', () => jest.requireActual('./testMocks').createSheetReanimatedMock());
jest.mock('react-native-worklets', () => jest.requireActual('./testMocks').createWorkletsMock());
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return { useFocusEffect: (callback: () => void) => useEffect(callback, [callback]) };
});
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

async function renderForest(services: Services) {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ServicesProvider services={services}>
        <ForestScreen />
      </ServicesProvider>
    </SafeAreaProvider>,
  );
}

const treeButtonName = (tree: ForestTree) => `${tree.species}, ${tree.region}`;

beforeEach(() => jest.clearAllMocks());
afterEach(() => {
  setReducedMotion(false);
  jest.useRealTimers();
});

describe('ForestScreen (varsayılan senaryo)', () => {
  it('sayıları ve bölge listesini servis verisinden gösterir', async () => {
    const services = createMockServices();
    const trees = await services.forest.getTrees();
    await renderForest(services);

    expect(await screen.findByText('Dikim bölgeleri')).toBeTruthy();
    expect(screen.getByLabelText(`${formatCount(trees.length)} ağaç`)).toBeTruthy();
    expect(
      screen.getByLabelText(`tahmini karbondioksit, yılda ${formatCount(estimateCo2Kg(trees.length))} kilogram`),
    ).toBeTruthy();
    expect(screen.getByText('tahmini CO₂ (kg/yıl)')).toBeTruthy();
    expect(screen.getByText('Örnek')).toBeTruthy();
    const regions = summarizeRegions(trees);
    for (const region of regions) expect(screen.getByText(region.name)).toBeTruthy();
    const counts = screen.getAllByText(/^\d+ ağaç$/).map((node) => node.props.children);
    expect(counts).toEqual(regions.map((r) => `${r.treeCount} ağaç`));
    expect(screen.getAllByRole('button')).toHaveLength(trees.length);
  });

  it('ağaç etiketi "Tür, Bölge" biçimindedir', async () => {
    const services = createMockServices();
    const [first] = await services.forest.getTrees();
    await renderForest(services);

    expect(await screen.findByRole('button', { name: treeButtonName(first) })).toBeTruthy();
  });

  it('seçilen ağaca dokununca Light haptic verir ve o ağacın sheet içeriğini gösterir', async () => {
    const services = createMockServices();
    const trees = await services.forest.getTrees();
    const target = trees.find((t) => t.sponsor) ?? trees[0];
    await renderForest(services);

    await fireEvent.press(await screen.findByRole('button', { name: treeButtonName(target) }));

    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    expect(screen.getByRole('header', { name: target.species })).toBeTruthy();
    expect(screen.getByText(new RegExp(`${formatPlantedDate(target.plantedAt)} · Sertifika no ${target.certificateNo}`))).toBeTruthy();
    expect(screen.getByText('Örnek sertifika')).toBeTruthy();
    expect(screen.getByText(`Bu ağacın dikimini ${target.sponsor} üstlendi`)).toBeTruthy();
    expect(screen.getByRole('image', { name: `${target.species} ağacı çizimi` })).toBeTruthy();
  });

  it('Kapat düğmesi sheet`i kapatır ve ağaçlar yeniden etkileşimli olur', async () => {
    const services = createMockServices();
    const trees = await services.forest.getTrees();
    await renderForest(services);
    await fireEvent.press(await screen.findByRole('button', { name: treeButtonName(trees[0]) }));
    expect(screen.getByText('Örnek sertifika')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Kapat' }));

    await waitFor(() => expect(screen.queryByText('Örnek sertifika')).toBeNull());
    expect(screen.getAllByRole('button')).toHaveLength(trees.length);
  });

  it('Modal onRequestClose (Android geri tuşu) sheet`i kapatır', async () => {
    const services = createMockServices();
    const trees = await services.forest.getTrees();
    await renderForest(services);
    await fireEvent.press(await screen.findByRole('button', { name: treeButtonName(trees[1]) }));

    await act(async () => {
      screen.root?.queryAll((node) => node.type === 'Modal')[0]?.props.onRequestClose();
    });

    await waitFor(() => expect(screen.queryByText('Örnek sertifika')).toBeNull());
  });
});

describe('ForestScreen (boş, yükleniyor, hata)', () => {
  it('boş senaryoda boş sahneyi, 0 sayılarını ve bir sonraki adımı gösterir', async () => {
    await renderForest(createMockServices({ scenario: 'empty' }));

    expect(await screen.findByText("Henüz ağacın yok, ilk 20 km'yi bekliyor.")).toBeTruthy();
    expect(screen.getByLabelText('0 ağaç')).toBeTruthy();
    expect(screen.getByLabelText('tahmini karbondioksit, yılda 0 kilogram')).toBeTruthy();
    expect(screen.getByRole('image', { name: /Boş orman/ })).toBeTruthy();
    expect(screen.queryByText('Dikim bölgeleri')).toBeNull();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('dolu ormanda sahneye boş orman etiketi verilmez', async () => {
    await renderForest(createMockServices());

    await screen.findByText('Dikim bölgeleri');
    expect(screen.queryByLabelText(/Boş orman/, { includeHiddenElements: true })).toBeNull();
  });

  it('yüklenirken sade sahne çerçevesini gösterir', async () => {
    jest.useFakeTimers();
    await renderForest(createMockServices({ latencyMs: 50 }));

    expect(screen.getByRole('progressbar', { name: 'Orman yükleniyor' })).toBeTruthy();
    expect(screen.queryByText('Dikim bölgeleri')).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(await screen.findByText('Dikim bölgeleri')).toBeTruthy();
  });

  it('hatada Türkçe mesajı gösterir, "Tekrar dene" yeniden yükler', async () => {
    const services = createMockServices({ scenario: 'error' });
    await renderForest(services);
    expect(await screen.findByText(/Ormanına şu an ulaşamadık/)).toBeTruthy();

    services.forest.getTrees = createMockServices().forest.getTrees;
    await fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));

    await waitFor(() => expect(screen.getByText('Dikim bölgeleri')).toBeTruthy());
    expect(screen.queryByText(/Ormanına şu an ulaşamadık/)).toBeNull();
  });
});

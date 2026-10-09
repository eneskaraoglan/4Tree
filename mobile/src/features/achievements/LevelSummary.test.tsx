import { render, screen } from '@testing-library/react-native';

import { LevelSummary } from './LevelSummary';

describe('LevelSummary', () => {
  it('en üst seviyede (Orman) sonraki seviye cümlesi yerine kutlama gösterir ve çubuğu gizler', async () => {
    await render(<LevelSummary level={{ level: 'forest', nextLevel: null, progress: 1 }} />);

    expect(screen.getByTestId('level-name')).toHaveTextContent('Orman');
    expect(screen.getByTestId('level-sentence')).toHaveTextContent('En üst seviyedesin, ormanın büyümeye devam ediyor.');
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('ara seviyede ilerleme çubuğunu yüzdeyle gösterir', async () => {
    await render(<LevelSummary level={{ level: 'sapling', nextLevel: 'tree', progress: 0.5 }} />);

    expect(screen.getByRole('progressbar')).toHaveProp('accessibilityValue', { min: 0, max: 100, now: 50 });
    expect(screen.getByTestId('level-sentence')).toHaveTextContent('Ağaç olmana 4 ağaç kaldı.');
  });
});

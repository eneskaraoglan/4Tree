import { render, screen } from '@testing-library/react-native';

import { REACTION_TYPES } from './reactions';
import { ReactionIcon } from './ReactionIcons';

describe('ReactionIcon', () => {
  it.each(REACTION_TYPES)('%s ikonu çizilir (24 dp varsayılan)', async (type) => {
    await render(<ReactionIcon type={type} color="#fff" />);
    const svg = screen.getByTestId(`reaction-icon-${type}`);
    expect(svg.props.width).toBe(24);
    expect(svg.props.height).toBe(24);
  });

  it('boyut verilebilir', async () => {
    await render(<ReactionIcon type="water" size={18} color="#fff" />);
    expect(screen.getByTestId('reaction-icon-water').props.width).toBe(18);
  });
});

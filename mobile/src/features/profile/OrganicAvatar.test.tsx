import { render, screen } from '@testing-library/react-native';

import { OrganicAvatar } from './OrganicAvatar';

const shown = () => screen.getByText(/./, { includeHiddenElements: true });

describe('OrganicAvatar', () => {
  it('harfi olduğu gibi gösterir (büyük harfe çevirmez)', async () => {
    await render(<OrganicAvatar name="Elif" initial="E" />);
    expect(shown().props.children).toBe('E');
  });

  it('yalnız ilk karakteri gösterir', async () => {
    await render(<OrganicAvatar name="Elif" initial="Elif" />);
    expect(shown().props.children).toBe('E');
  });

  it('astral karakter (surrogate çifti) bölünmez', async () => {
    await render(<OrganicAvatar name="Ağaç" initial="🌲x" />);
    expect(shown().props.children).toBe('🌲');
  });
});

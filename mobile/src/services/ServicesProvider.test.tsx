import { render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useEffect, useState } from 'react';

import { createMockServices } from './mock';
import { ServicesProvider, useServices } from './ServicesProvider';

function NameProbe() {
  const { profile } = useServices();
  const [name, setName] = useState('...');
  useEffect(() => {
    profile.getProfile().then((p) => setName(p.name));
  }, [profile]);
  return <Text>{name}</Text>;
}

describe('ServicesProvider', () => {
  it('Provider yokken varsayılan mock servisleri verir', async () => {
    await render(<NameProbe />);
    await waitFor(() => expect(screen.getByText('Elif')).toBeTruthy());
  });

  it('verilen servis setini kullanır', async () => {
    const services = createMockServices();
    services.profile.getProfile = async () => ({
      id: 'u',
      name: 'Test Kullanıcı',
      avatarInitial: 'T',
      level: 'seed',
      totalKm: 0,
      totalTrees: 0,
      activeDays: 0,
    });
    await render(
      <ServicesProvider services={services}>
        <NameProbe />
      </ServicesProvider>,
    );
    await waitFor(() => expect(screen.getByText('Test Kullanıcı')).toBeTruthy());
  });
});

import { LocationPermissionError } from './LocationSource';
import { createSimulatedLocationSource } from './simulatedLocationSource';
import type { LocationSample } from './types';

describe('simulatedLocationSource', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('izin akışını taklit eder: önce sorulmamış, istenince verilmiş', async () => {
    const source = createSimulatedLocationSource();
    expect(await source.getPermission()).toBe('undetermined');
    expect(await source.requestPermission()).toBe('granted');
    expect(await source.getPermission()).toBe('granted');
  });

  it('izin yokken start LocationPermissionError fırlatır', async () => {
    const source = createSimulatedLocationSource();
    await expect(source.start({ onSample: jest.fn(), onError: jest.fn() })).rejects.toBeInstanceOf(LocationPermissionError);
  });

  it('aralıkla, istenen hızda ilerleyen ölçümler yayar ve durdurulabilir', async () => {
    const source = createSimulatedLocationSource({ permission: 'granted', speedMs: 3, intervalMs: 1000, now: () => 5 });
    const samples: LocationSample[] = [];
    const tracking = await source.start({ onSample: (s) => samples.push(s), onError: jest.fn() });
    jest.advanceTimersByTime(3000);
    expect(samples).toHaveLength(3);
    expect(samples[0]).toMatchObject({ timestamp: 5, accuracyM: 6, speedMs: 3 });
    expect(samples[2].lng).toBeGreaterThan(samples[0].lng);
    await tracking.stop();
    jest.advanceTimersByTime(5000);
    expect(samples).toHaveLength(3);
  });
});

import { describe, expect, it } from 'vitest';
import {
  formatPace,
  formatSpeed,
  paceSecondsPerKm,
  speedKmh,
} from '@/utils/runMetrics';

describe('runMetrics', () => {
  it('returns null for zero distance or duration', () => {
    expect(paceSecondsPerKm({ distanceKm: 0, durationSeconds: 600 })).toBeNull();
    expect(speedKmh({ distanceKm: 5, durationSeconds: 0 })).toBeNull();
  });

  it('computes pace and speed', () => {
    // 5 km in 1500s = 300 s/km = 5:00 /km, 12 km/h.
    const run = { distanceKm: 5, durationSeconds: 1500 };
    expect(paceSecondsPerKm(run)).toBe(300);
    expect(speedKmh(run)).toBe(12);
  });

  it('renders "—" when undefined', () => {
    expect(formatPace({ distanceKm: 0, durationSeconds: 0 })).toBe('—');
    expect(formatSpeed({ distanceKm: 0, durationSeconds: 0 })).toBe('—');
  });

  it('formats pace as m:ss /km and rolls 60s up to the next minute', () => {
    expect(formatPace({ distanceKm: 2, durationSeconds: 660 })).toBe('5:30 /km');
    // 330.6 s/km rounds to 331 -> 5:31, and a value rounding to :60 rolls over.
    expect(formatPace({ distanceKm: 1, durationSeconds: 359.6 })).toBe('6:00 /km');
  });

  it('formats speed with one decimal', () => {
    expect(formatSpeed({ distanceKm: 10, durationSeconds: 3300 })).toBe('10.9 km/h');
  });
});

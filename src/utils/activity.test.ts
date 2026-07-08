import { describe, expect, it } from 'vitest';
import { computeStreaks, dateKey, weeklyActiveCount } from '@/utils/activity';

const DAY = 86400000;
const dayAgo = (n: number) => dateKey(Date.now() - n * DAY);

describe('computeStreaks', () => {
  it('is zero for no activity', () => {
    expect(computeStreaks(new Set())).toEqual({ current: 0, best: 0 });
  });

  it('counts consecutive days ending today', () => {
    const keys = new Set([dayAgo(0), dayAgo(1), dayAgo(2)]);
    expect(computeStreaks(keys).current).toBe(3);
  });

  it('keeps the current streak alive when today is not yet active (ends yesterday)', () => {
    const keys = new Set([dayAgo(1), dayAgo(2)]);
    expect(computeStreaks(keys).current).toBe(2);
  });

  it('resets the current streak after a gap of two days', () => {
    const keys = new Set([dayAgo(3), dayAgo(4)]);
    expect(computeStreaks(keys).current).toBe(0);
  });

  it('reports the longest run ever as best', () => {
    const keys = new Set([dayAgo(10), dayAgo(11), dayAgo(12), dayAgo(13), dayAgo(0)]);
    expect(computeStreaks(keys).best).toBe(4);
  });
});

describe('weeklyActiveCount', () => {
  it('is zero with no activity', () => {
    expect(weeklyActiveCount(new Set())).toBe(0);
  });

  it('counts today (always within the current week)', () => {
    expect(weeklyActiveCount(new Set([dayAgo(0)]))).toBeGreaterThanOrEqual(1);
  });

  it('ignores dates well outside the current week', () => {
    expect(weeklyActiveCount(new Set([dayAgo(30), dayAgo(60)]))).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import {
  formatDistanceKm,
  formatDuration,
  formatRunTime,
  formatSetValue,
} from '@/utils/format';

describe('formatDuration', () => {
  it('formats minutes', () => {
    expect(formatDuration(42 * 60000)).toBe('42m');
  });
  it('formats hours with zero-padded minutes', () => {
    expect(formatDuration((60 + 4) * 60000)).toBe('1h 04m');
  });
  it('clamps negative/zero to 0m', () => {
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(-5000)).toBe('0m');
  });
});

describe('formatRunTime', () => {
  it('formats M:SS under an hour', () => {
    expect(formatRunTime(65)).toBe('1:05');
  });
  it('formats H:MM:SS past an hour', () => {
    expect(formatRunTime(3661)).toBe('1:01:01');
  });
});

describe('formatDistanceKm', () => {
  it('trims decimals', () => {
    expect(formatDistanceKm(5)).toBe('5 km');
    expect(formatDistanceKm(5.234)).toBe('5.23 km');
  });
});

describe('formatSetValue', () => {
  it('renders plain reps by default', () => {
    expect(formatSetValue(8)).toBe('8');
    expect(formatSetValue(8, 'reps')).toBe('8');
  });
  it('renders seconds under a minute for time sets', () => {
    expect(formatSetValue(45, 'time')).toBe('45s');
  });
  it('renders minutes and seconds for time sets', () => {
    expect(formatSetValue(90, 'time')).toBe('1m 30s');
    expect(formatSetValue(120, 'time')).toBe('2m');
  });
});

import { expect, it } from 'vitest';
import type { Run, WorkoutSession } from '@/types';
import { activityStreaks } from './activityStreaks';

const date = (value: string) => new Date(`${value}T12:00:00`).getTime();
const run = (day: string) => ({ date: date(day) }) as Run;
const session = (day: string, status = 'completed') => ({ date: date(day), status }) as WorkoutSession;

it('counts consecutive Monday-based weeks once and keeps an unfinished week open', () => {
  const value = activityStreaks([session('2026-10-01'), session('2026-10-06')], [run('2026-10-08')], 'week', date('2026-10-12'));
  expect(value).toMatchObject({ current: 2, best: 2, activeThisPeriod: false, activeDaysThisWeek: 0 });
  expect(activityStreaks([session('2026-10-01'), session('2026-10-06')], [], 'week', date('2026-10-19')).current).toBe(0);
});

it('unions runs with completed workouts, ignores active sessions, invalid and future dates', () => {
  const value = activityStreaks([session('2026-10-12'), session('2026-10-12'), session('2026-10-11', 'active')], [run('2026-10-13'), run('2026-10-20'), { date: NaN } as Run], 'day', date('2026-10-14'));
  expect(value).toMatchObject({ current: 2, best: 2, activeDaysThisWeek: 2, activeThisPeriod: false });
  expect(value.days[0].count).toBe(2);
  expect(value.days[1].count).toBe(1);
  expect(value.days.at(-1)?.future).toBe(true);
});

it('keeps historical best through gaps and handles year boundaries and empty histories', () => {
  const runs = ['2025-12-22', '2025-12-29', '2026-01-05', '2026-03-02'].map(run);
  expect(activityStreaks([], runs, 'week', date('2026-03-02'))).toMatchObject({ current: 1, best: 3 });
  expect(activityStreaks([], [], 'week', date('2026-03-02'))).toMatchObject({ current: 0, best: 0 });
});

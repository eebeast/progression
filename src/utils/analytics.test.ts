import { describe, expect, it } from 'vitest';
import { activityTimeline, calendarRange, customRange, summarizeGym, summarizeRuns } from './analytics';
import type { ExerciseLog, Run, WorkoutSession } from '@/types';

describe('calendar analytics', () => {
  it('starts weeks on Monday and uses exclusive local calendar boundaries', () => {
    const range = calendarRange('week', new Date(2026, 9, 18, 12));
    expect(new Date(range.from)).toEqual(new Date(2026, 9, 12));
    expect(new Date(range.to)).toEqual(new Date(2026, 9, 19));
    expect(customRange('2026-10-17', '2026-10-17')).toEqual({ from: new Date(2026, 9, 17).getTime(), to: new Date(2026, 9, 18).getTime() });
    expect(customRange('2026-02-30', '2026-03-01')).toBeNull();
    expect(customRange('2026-10-19', '2026-10-17')).toBeNull();
  });
  it('uses completed sessions only, excludes warmups, retains zero-set sessions and unspecified muscles', () => {
    const sessions = [{ id: 'complete', status: 'completed', date: 1 }, { id: 'active', status: 'active', date: 1 }, { id: 'zero', status: 'completed', date: 2 }] as WorkoutSession[];
    const logs = [
      { sessionId: 'complete', exerciseId: 'e', exerciseName: 'Squat' },
      { sessionId: 'complete', exerciseId: 'e', isWarmup: true },
      { sessionId: 'active', exerciseId: 'e' },
    ] as ExerciseLog[];
    expect(summarizeGym(sessions, logs, [], { from: 0, to: 3 })).toMatchObject({ sessions: 2, workingSets: 1, byMuscle: [['Unspecified', 1]] });
    expect(summarizeGym(sessions, logs, [], { from: 0, to: 3 }, { exerciseId: 'e' }).sessions).toBe(1);
  });
  it('retains incomplete runs in counts but excludes unavailable values and invalid pace pairs', () => {
    const runs = [{ date: 1, distanceKm: 5, durationSeconds: 1500 }, { date: 1, distanceKm: 0, durationSeconds: 600 }, { date: 1, distanceKm: 2 }, { date: 3, distanceKm: 100, durationSeconds: 100 }] as Run[];
    expect(summarizeRuns(runs, { from: 0, to: 3 })).toEqual({ count: 3, distanceKm: 7, durationSeconds: 2100, pairedDistanceKm: 5, pairedDurationSeconds: 1500, longestKm: 5, incomplete: 2 });
  });

  it('charts local calendar days, excludes warm-ups and active workouts, and retains zero-set days', () => {
    const date = new Date(2026, 9, 13, 23, 30).getTime();
    const sessions = [{ id: 'done', status: 'completed', date }, { id: 'active', status: 'active', date }, { id: 'empty', status: 'completed', date }] as WorkoutSession[];
    const logs = [{ sessionId: 'done', exerciseId: 'e' }, { sessionId: 'done', exerciseId: 'e', isWarmup: true }, { sessionId: 'active', exerciseId: 'e' }] as ExerciseLog[];
    const runs = [{ date, distanceKm: 5 }, { date, distanceKm: NaN }] as Run[];
    const range = calendarRange('week', new Date(date));
    const points = activityTimeline(sessions, logs, [], runs, range);
    expect(points).toHaveLength(7);
    expect(points[0]).toMatchObject({ workouts: 0, workingSets: 0, distanceKm: 0 });
    expect(points[1]).toMatchObject({ date: new Date(2026, 9, 13).getTime(), workouts: 2, workingSets: 1, distanceKm: 5 });
    expect(activityTimeline(sessions, logs, [], runs, range, { exerciseId: 'missing' })[1]).toMatchObject({ workouts: 0, workingSets: 0, distanceKm: 5 });
    expect(activityTimeline(sessions, logs, [], runs, range, { exerciseId: 'e' })[1].workouts).toBe(1);
  });

  it('bounds long custom charts without losing records at either edge', () => {
    const range = customRange('2020-01-01', '2026-12-31')!;
    const runs = [{ date: range.from, distanceKm: 3 }, { date: range.to - 1, distanceKm: 7 }, { date: range.to, distanceKm: 100 }] as Run[];
    const points = activityTimeline([], [], [], runs, range);
    expect(points.length).toBeLessThanOrEqual(31);
    expect(points[0].date).toBe(range.from);
    expect(points.at(-1)?.through).toBe(range.to - 1);
    expect(points.reduce((sum, point) => sum + point.distanceKm, 0)).toBe(10);
    expect(activityTimeline([], [], [], [], { from: 1, to: 0 })).toEqual([]);
  });
});

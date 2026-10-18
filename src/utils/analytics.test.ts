import { describe, expect, it } from 'vitest';
import { calendarRange, customRange, summarizeGym, summarizeRuns } from './analytics';
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
});

import { expect, it } from 'vitest';
import type { ExerciseLog, WorkoutSession } from '@/types';
import { exerciseSetLoads } from './setLoads';

it('retains every working-set load in completed history, including repeats and zero added weight', () => {
  const sessions = [{ id: 'old', status: 'completed', date: 1 }, { id: 'new', status: 'completed', date: 1000 }, { id: 'active', status: 'active', date: 2000 }] as WorkoutSession[];
  const logs = [
    { id: 'new', sessionId: 'new', exerciseId: 'e', weight: 50, reps: 8, setNumber: 1, timestamp: 1001 },
    { id: 'repeat', sessionId: 'old', exerciseId: 'e', weight: 40, reps: 8, setNumber: 2, timestamp: 3 },
    { id: 'old', sessionId: 'old', exerciseId: 'e', weight: 40, reps: 8, setNumber: 1, timestamp: 2 },
    { id: 'zero', sessionId: 'old', exerciseId: 'e', weight: 0, reps: 10, setNumber: 3, timestamp: 4 },
    { id: 'warm', sessionId: 'old', exerciseId: 'e', weight: 20, isWarmup: true },
    { id: 'active', sessionId: 'active', exerciseId: 'e', weight: 90 },
    { id: 'bad', sessionId: 'old', exerciseId: 'e', weight: NaN },
  ] as ExerciseLog[];
  expect(exerciseSetLoads(logs, sessions, 'e').map((point) => [point.id, point.value])).toEqual([['old', 40], ['repeat', 40], ['zero', 0], ['new', 50]]);
});

it('plots all alias IDs chronologically without collapsing separate sets with equal values', () => {
  const sessions = [{ id: 'old', status: 'completed', date: 1 }, { id: 'new', status: 'completed', date: 2 }] as WorkoutSession[];
  const logs = [
    { id: 'new', sessionId: 'new', exerciseId: 'new-bench', weight: 50, reps: 8, setNumber: 1, timestamp: 2 },
    { id: 'old', sessionId: 'old', exerciseId: 'old-bench', weight: 50, reps: 8, setNumber: 1, timestamp: 1 },
    { id: 'other', sessionId: 'new', exerciseId: 'incline-bench', weight: 40, reps: 8, setNumber: 1, timestamp: 2 },
  ] as ExerciseLog[];
  expect(exerciseSetLoads(logs, sessions, ['old-bench', 'new-bench']).map(({ id, value }) => [id, value])).toEqual([['old', 50], ['new', 50]]);
});

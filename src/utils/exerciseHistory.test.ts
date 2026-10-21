import { expect, it } from 'vitest';
import type { Exercise, ExerciseLog } from '@/types';
import { exerciseHistoryIds, matchingExercises, reusableExercise } from './exerciseHistory';

const exercise = (id: string, name: string, patch: Partial<Exercise> = {}): Exercise => ({ id, name, createdAt: 1, ...patch });

it('connects catalog aliases and exact duplicate names without changing the saved identities', () => {
  const exercises = [exercise('old', 'Bench Press'), exercise('new', 'Barbell Bench Press'), exercise('third', 'Barbell Bench Press')];
  const before = structuredClone(exercises);
  const ids = exerciseHistoryIds(exercises);
  for (const id of ['old', 'new', 'third']) expect(ids.get(id)).toEqual(['new', 'old', 'third']);
  expect(exercises).toEqual(before);
});

it('preserves distinct equipment, explicit category choices, weighted variants and user-confirmed distinct movements', () => {
  const exercises = [
    exercise('barbell', 'Bench Press', { equipment: 'Barbell' }),
    exercise('machine', 'Barbell Bench Press', { equipment: 'Machine' }),
    exercise('ambiguous', 'Bench Press'),
    exercise('explicit', 'Bench Press', { category: 'Arms' }),
    exercise('distinct', 'Bench Press', { separateHistory: true }),
    exercise('weighted', 'Weighted Pull-ups'), exercise('unweighted', 'Pull-ups'),
    exercise('custom1', 'Custom press'), exercise('custom2', 'Custom press'),
  ];
  const ids = exerciseHistoryIds(exercises);
  expect(ids.get('barbell')).toEqual(['ambiguous', 'barbell']);
  expect(ids.get('ambiguous')).toEqual(['ambiguous', 'barbell']);
  for (const { id } of exercises.filter((exercise) => !['barbell', 'ambiguous'].includes(exercise.id))) expect(ids.get(id)).toEqual([id]);
});

it('does not infer that an unlabeled barbell preset was performed on a machine', () => {
  const ids = exerciseHistoryIds([
    exercise('legacy', 'Bench Press'),
    exercise('machine', 'Barbell Bench Press', { equipment: 'machine' }),
  ]);
  expect(ids.get('legacy')).toEqual(['legacy']);
  expect(ids.get('machine')).toEqual(['machine']);
});

it('includes unambiguous orphan history and archived definitions, without inferring ambiguous renamed orphans', () => {
  const exercises = [exercise('current', 'Barbell Row'), exercise('archived', 'Barbell Bent-over Row', { archivedAt: 1 })];
  const logs = [
    { exerciseId: 'missing', exerciseName: 'Barbell Bent-over Row' },
    { exerciseId: 'renamed', exerciseName: 'Barbell Row' },
    { exerciseId: 'renamed', exerciseName: 'Dumbbell Row' },
  ] as ExerciseLog[];
  const ids = exerciseHistoryIds(exercises, logs);
  expect(ids.get('current')).toEqual(['archived', 'current', 'missing']);
  expect(ids.get('renamed')).toEqual(['renamed']);
});

it('reuses a compatible existing alias rather than minting another ID', () => {
  const exercises = [exercise('old', 'Bench Press', { createdAt: 1 }), exercise('new', 'Barbell Bench Press', { createdAt: 2 })];
  expect(reusableExercise(exercises, 'Barbell Bench Press')?.id).toBe('old');
  expect(matchingExercises(exercises, 'bench press')).toHaveLength(2);
  expect(reusableExercise([exercise('x', 'Bench Press', { separateHistory: true })], 'Barbell Bench Press')).toBeUndefined();
  expect(reusableExercise([exercise('x', 'Bench Press', { equipment: 'barbell' }), exercise('y', 'Bench Press', { equipment: 'machine' })], 'Bench Press')).toBeUndefined();
});

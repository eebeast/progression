import { expect, it } from 'vitest';
import type { Exercise, ExerciseLog } from '@/types';
import { categoryExercises } from './categoryExercises';

it('shows one preset for interchangeable row and curl names', () => {
  const back = categoryExercises('Back', [], []);
  expect(back.filter((row) => ['Barbell Row', 'Barbell Bent-over Row'].includes(row.name))).toEqual([{ name: 'Barbell Row' }]);
  const arms = categoryExercises('Arms', [], []);
  expect(arms.filter((row) => ['EZ Bar Curl', 'EZ Bar Biceps Curl'].includes(row.name))).toEqual([{ name: 'EZ Bar Curl' }]);
  const chest = categoryExercises('Chest', [], []);
  expect(chest.filter((row) => ['Bench Press', 'Barbell Bench Press'].includes(row.name))).toEqual([{ name: 'Barbell Bench Press' }]);
  expect(back).toContainEqual({ name: 'Pull-ups' });
  expect(back).toContainEqual({ name: 'Weighted Pull-ups' });
});

it('hides unlogged aliases when the equivalent exercise already has records', () => {
  const exercises = [
    { id: 'unused', name: 'Barbell Bent-over Row', createdAt: 0 },
    { id: 'recorded', name: 'Barbell Row', createdAt: 0 },
  ];
  const logs = [{ exerciseId: 'recorded', exerciseName: 'Barbell Row' }] as ExerciseLog[];
  const rows = categoryExercises('Back', exercises, logs);
  expect(rows.filter((row) => row.id)).toEqual([{ id: 'recorded', name: 'Barbell Row' }]);
  expect(categoryExercises('Back', exercises, []).filter((row) => row.id)).toHaveLength(1);
});

it('retains both recorded identities when equivalent names have separate history', () => {
  const exercises = [
    { id: 'old', name: 'Barbell Bent-over Row', createdAt: 0 },
    { id: 'new', name: 'Barbell Row', createdAt: 0 },
  ];
  const logs = exercises.map(({ id, name }) => ({ exerciseId: id, exerciseName: name })) as ExerciseLog[];
  expect(categoryExercises('Back', exercises, logs).filter((row) => row.id)).toHaveLength(2);
});

it('includes all catalog exercises and keeps duplicate-name logged IDs distinct', () => {
  const exercises = [{ id: 'a', name: 'Dumbell Curl', createdAt: 0 }, { id: 'b', name: 'Dumbbell Curl', createdAt: 0 }] as Exercise[];
  const logs = exercises.map((exercise) => ({ exerciseId: exercise.id, exerciseName: exercise.name })) as ExerciseLog[];
  const rows = categoryExercises('Arms', exercises, logs);
  expect(rows.filter((row) => row.id).map((row) => row.id).sort()).toEqual(['a', 'b']);
  expect(rows).toContainEqual({ name: 'Hammer Curl' });
  expect(rows.filter((row) => row.name === 'Dumbbell Curl')).toHaveLength(1);
});

it('keeps archived and missing-definition history while respecting explicit recategorization', () => {
  const exercises = [{ id: 'old', name: 'Custom curl', category: 'Arms', archivedAt: 1 }, { id: 'moved', name: 'Barbell Curl', category: 'Back' }] as Exercise[];
  const logs = [{ exerciseId: 'old', exerciseName: 'Custom curl' }, { exerciseId: 'missing', exerciseName: 'Cable Crunch' }, { exerciseId: 'moved', exerciseName: 'Barbell Curl' }] as ExerciseLog[];
  expect(categoryExercises('Arms', exercises, logs)).toContainEqual({ id: 'old', name: 'Custom curl' });
  expect(categoryExercises('Arms', exercises, logs).some((row) => row.id === 'moved')).toBe(false);
  expect(categoryExercises('Core', exercises, logs)).toContainEqual({ id: 'missing', name: 'Cable Crunch' });
});

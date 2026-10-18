import { expect, it } from 'vitest';
import type { Exercise, ExerciseLog } from '@/types';
import { categoryExercises } from './categoryExercises';

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

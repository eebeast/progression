import { expect, it } from 'vitest';
import { muscleGroup } from './muscleGroups';
import { PROGRAM } from '@/storage/defaults';
import { userExerciseCategories } from '@/test/fixtures/userExerciseCategories';

it.each(userExerciseCategories)('includes reported plan exercise %s in %s', (name, category) => {
  expect(muscleGroup({ id: 'original-id', name, createdAt: 0 })).toBe(category);
  expect(muscleGroup(undefined, name)).toBe(category);
});

it('gives every predefined movement a display group', () => {
  for (const day of PROGRAM) for (const exercise of day.exercises) {
    expect(muscleGroup({ ...exercise, id: 'e', createdAt: 0 })).not.toBe('Unspecified');
  }
});

// Original shipped program: these records predate explicit category metadata.
it.each([
  ['Bench Press', 'Chest'], ['Incline DB Press', 'Chest'],
  ['Overhead Press', 'Compound'], ['Lateral Raise', 'Arms'],
  ['Skullcrusher', 'Arms'], ['Triceps Pushdown', 'Arms'],
  ['Deadlift', 'Compound'], ['Pull-up', 'Back'], ['Barbell Row', 'Back'],
  ['Face Pull', 'Back'], ['Barbell Curl', 'Arms'], ['Hammer Curl', 'Arms'],
  ['Squat', 'Legs'], ['Romanian Deadlift', 'Compound'], ['Leg Press', 'Legs'],
  ['Leg Curl', 'Legs'], ['Calf Raise', 'Legs'],
  ['Ab Wheel Rollouts', 'Core'], ['Ab Rollout', 'Core'], ['Situp', 'Core'],
])('categorizes original or legacy movement %s as %s without metadata', (name, category) => {
  expect(muscleGroup({ id: 'legacy', name, createdAt: 0 })).toBe(category);
  expect(muscleGroup(undefined, name)).toBe(category);
});

it.each([
  ['Barbell Curl', 'Arms'], ['Dumbell Curl', 'Arms'], ['Dumbbell Biceps Curl', 'Arms'],
  ['Triceps Pushdown', 'Arms'], ['Tricep Extension', 'Arms'], ['Tricepes Pushdown', 'Arms'],
  ['Cable Crunch', 'Core'], ['Crunches', 'Core'], ['Hanging Leg Raises', 'Core'],
])('recognizes legacy exercise name %s as %s', (name, category) => {
  expect(muscleGroup({ id: 'legacy', name, createdAt: 0 })).toBe(category);
});

it('respects saved labels, groups known labels and leaves unknown custom movements unspecified', () => {
  expect(muscleGroup({ id: 'e', name: 'Weighted Pull-ups', primaryMuscle: ' Biceps ', createdAt: 0 })).toBe('Arms');
  expect(muscleGroup({ id: 'e', name: 'Custom', primaryMuscle: 'Upper body', createdAt: 0 })).toBe('Unspecified');
  expect(muscleGroup({ id: 'e', name: 'Deadlift', category: 'Legs', createdAt: 0 })).toBe('Legs');
  expect(muscleGroup(undefined, 'Deadlift')).toBe('Compound');
  expect(muscleGroup(undefined, 'Clean and Press')).toBe('Compound');
  expect(muscleGroup(undefined, 'Push ups')).toBe('Chest');
  expect(muscleGroup(undefined, ' weighted pull-ups ')).toBe('Back');
  expect(muscleGroup(undefined, 'Custom movement')).toBe('Unspecified');
});

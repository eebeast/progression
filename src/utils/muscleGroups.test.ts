import { expect, it } from 'vitest';
import { muscleGroup } from './muscleGroups';
import { PROGRAM } from '@/storage/defaults';

it('gives every predefined movement a display group', () => {
  for (const day of PROGRAM) for (const exercise of day.exercises) {
    expect(muscleGroup({ ...exercise, id: 'e', createdAt: 0 })).not.toBe('Unspecified');
  }
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

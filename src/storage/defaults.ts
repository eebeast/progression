import type { Settings } from '@/types';

/** Pure default/seed data — no storage dependency. */

export const DEFAULT_SETTINGS: Settings = {
  id: 'singleton',
  userName: '',
  unit: 'kg',
  theme: 'system',
  accent: 'blue',
  weightIncrement: 2.5,
  weeklyGoal: 4,
  showExerciseLibrary: false,
};

export interface SeedExercise {
  name: string;
  targetSets: number;
  targetRepRange: string;
}

export const PROGRAM: {
  name: string;
  estimatedMinutes: number;
  exercises: SeedExercise[];
}[] = [
  {
    name: 'Push',
    estimatedMinutes: 60,
    exercises: [
      { name: 'Bench Press', targetSets: 4, targetRepRange: '6-8' },
      { name: 'Incline DB Press', targetSets: 3, targetRepRange: '8-12' },
      { name: 'Overhead Press', targetSets: 3, targetRepRange: '6-10' },
      { name: 'Lateral Raise', targetSets: 3, targetRepRange: '12-15' },
      { name: 'Skullcrusher', targetSets: 3, targetRepRange: '8-12' },
      { name: 'Triceps Pushdown', targetSets: 3, targetRepRange: '10-15' },
    ],
  },
  {
    name: 'Pull',
    estimatedMinutes: 60,
    exercises: [
      { name: 'Deadlift', targetSets: 3, targetRepRange: '5' },
      { name: 'Pull-up', targetSets: 4, targetRepRange: '6-10' },
      { name: 'Barbell Row', targetSets: 3, targetRepRange: '8-10' },
      { name: 'Face Pull', targetSets: 3, targetRepRange: '12-15' },
      { name: 'Barbell Curl', targetSets: 3, targetRepRange: '8-12' },
      { name: 'Hammer Curl', targetSets: 3, targetRepRange: '10-12' },
    ],
  },
  {
    name: 'Legs',
    estimatedMinutes: 65,
    exercises: [
      { name: 'Squat', targetSets: 4, targetRepRange: '5-8' },
      { name: 'Romanian Deadlift', targetSets: 3, targetRepRange: '8-10' },
      { name: 'Leg Press', targetSets: 3, targetRepRange: '10-12' },
      { name: 'Leg Curl', targetSets: 3, targetRepRange: '10-15' },
      { name: 'Calf Raise', targetSets: 4, targetRepRange: '12-20' },
    ],
  },
];

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
    name: 'Pull', estimatedMinutes: 60,
    exercises: [
      { name: 'Weighted Pull-ups', targetSets: 3, targetRepRange: '6–10' },
      { name: 'Barbell Bent-over Row', targetSets: 3, targetRepRange: '8–12' },
      { name: 'One-arm Dumbbell Row', targetSets: 3, targetRepRange: '10–12' },
      { name: 'Reverse Dumbbell Fly', targetSets: 3, targetRepRange: '12–15' },
      { name: 'EZ Bar Biceps Curl', targetSets: 3, targetRepRange: '8–12' },
      { name: 'Hammer Curl', targetSets: 2, targetRepRange: '10–15' },
    ],
  },
  {
    name: 'Push', estimatedMinutes: 60,
    exercises: [
      { name: 'Barbell Bench Press', targetSets: 3, targetRepRange: '6–10' },
      { name: 'Incline Dumbbell Press', targetSets: 3, targetRepRange: '8–12' },
      { name: 'Standing Overhead Press', targetSets: 3, targetRepRange: '6–10' },
      { name: 'Dumbbell Lateral Raise', targetSets: 3, targetRepRange: '12–20' },
      { name: 'Dips', targetSets: 2, targetRepRange: '8–12' },
      { name: 'EZ Bar Skull Crushers', targetSets: 3, targetRepRange: '10–15' },
    ],
  },
  {
    name: 'Legs + Abs', estimatedMinutes: 65,
    exercises: [
      { name: 'Barbell Squat', targetSets: 3, targetRepRange: '6–10' },
      { name: 'Romanian Deadlift', targetSets: 3, targetRepRange: '8–12' },
      { name: 'Dumbbell Lunges', targetSets: 3, targetRepRange: '10 each leg' },
      { name: 'Standing Calf Raises', targetSets: 4, targetRepRange: '12–20' },
      { name: 'Ab Roller', targetSets: 3, targetRepRange: '6–12' },
      { name: 'Hanging Knee Raises', targetSets: 3, targetRepRange: '10–15' },
    ],
  },
  {
    name: 'Mix', estimatedMinutes: 60,
    exercises: [
      { name: 'Pull-ups', targetSets: 3, targetRepRange: '6–12' },
      { name: 'Barbell Row', targetSets: 3, targetRepRange: '8–12' },
      { name: 'Dumbbell Lateral Raise', targetSets: 3, targetRepRange: '12–20' },
      { name: 'EZ Bar Curl', targetSets: 3, targetRepRange: '8–12' },
      { name: 'Overhead Dumbbell Triceps Extension', targetSets: 3, targetRepRange: '10–15' },
      { name: 'Close-grip Bench Press', targetSets: 2, targetRepRange: '8–12' },
      { name: 'Ab Roller', targetSets: 2, targetRepRange: '8–12' },
    ],
  },
];

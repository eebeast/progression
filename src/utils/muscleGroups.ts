import type { Exercise } from '@/types';

/** Display categories for the predefined plan, not estimates of muscle activation. */
const presetGroups: Record<string, string> = {
  'weighted pull-ups': 'Back',
  'barbell bent-over row': 'Back',
  'one-arm dumbbell row': 'Back',
  'reverse dumbbell fly': 'Shoulders',
  'ez bar biceps curl': 'Arms',
  'hammer curl': 'Arms',
  'barbell bench press': 'Chest',
  'incline dumbbell press': 'Chest',
  'standing overhead press': 'Shoulders',
  'dumbbell lateral raise': 'Shoulders',
  'dips': 'Chest',
  'ez bar skull crushers': 'Arms',
  'barbell squat': 'Legs',
  'romanian deadlift': 'Legs',
  'dumbbell lunges': 'Legs',
  'standing calf raises': 'Legs',
  'ab roller': 'Core',
  'hanging knee raises': 'Core',
  'pull-ups': 'Back',
  'barbell row': 'Back',
  'ez bar curl': 'Arms',
  'overhead dumbbell triceps extension': 'Arms',
  'close-grip bench press': 'Arms',
};
const savedGroups: Record<string, string> = {
  back: 'Back', lats: 'Back',
  chest: 'Chest', pecs: 'Chest',
  shoulders: 'Shoulders', delts: 'Shoulders',
  arms: 'Arms', biceps: 'Arms', triceps: 'Arms', forearms: 'Arms',
  legs: 'Legs', quads: 'Legs', quadriceps: 'Legs', hamstrings: 'Legs', glutes: 'Legs', calves: 'Legs',
  core: 'Core', abs: 'Core', abdominals: 'Core',
};

/** Explicit saved labels win; only exact predefined names receive a fallback group. */
export function muscleGroup(exercise?: Exercise, historicalName = ''): string {
  const saved = exercise?.primaryMuscle?.trim();
  if (saved) return savedGroups[saved.toLowerCase()] ?? saved;
  return presetGroups[(exercise?.name ?? historicalName).trim().toLowerCase()] ?? 'Unspecified';
}

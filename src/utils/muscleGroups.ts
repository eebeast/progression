import type { Exercise, ExerciseCategory } from '@/types';

export const EXERCISE_CATEGORIES: ExerciseCategory[] = ['Chest', 'Legs', 'Back', 'Core', 'Arms', 'Compound'];

/** Preconfigured organizational categories, not estimates of muscle activation. */
export const EXERCISE_CATALOG: { name: string; category: ExerciseCategory }[] = [
  { name: 'Barbell Bench Press', category: 'Chest' },
  { name: 'Bench Press', category: 'Chest' },
  { name: 'Push-ups', category: 'Chest' },
  { name: 'Incline Dumbbell Press', category: 'Chest' },
  { name: 'Dips', category: 'Chest' },
  { name: 'Barbell Squat', category: 'Legs' },
  { name: 'Squat', category: 'Legs' },
  { name: 'Dumbbell Lunges', category: 'Legs' },
  { name: 'Standing Calf Raises', category: 'Legs' },
  { name: 'Weighted Pull-ups', category: 'Back' },
  { name: 'Pull-ups', category: 'Back' },
  { name: 'Barbell Bent-over Row', category: 'Back' },
  { name: 'Barbell Row', category: 'Back' },
  { name: 'One-arm Dumbbell Row', category: 'Back' },
  { name: 'Reverse Dumbbell Fly', category: 'Back' },
  { name: 'Ab Roller', category: 'Core' },
  { name: 'Hanging Knee Raises', category: 'Core' },
  { name: 'Plank', category: 'Core' },
  { name: 'EZ Bar Biceps Curl', category: 'Arms' },
  { name: 'EZ Bar Curl', category: 'Arms' },
  { name: 'Hammer Curl', category: 'Arms' },
  { name: 'EZ Bar Skull Crushers', category: 'Arms' },
  { name: 'Overhead Dumbbell Triceps Extension', category: 'Arms' },
  { name: 'Close-grip Bench Press', category: 'Arms' },
  { name: 'Dumbbell Lateral Raise', category: 'Arms' },
  { name: 'Deadlift', category: 'Compound' },
  { name: 'Romanian Deadlift', category: 'Compound' },
  { name: 'Clean and Press', category: 'Compound' },
  { name: 'Standing Overhead Press', category: 'Compound' },
];
const normalize = (name: string) => name.trim().toLowerCase().replace(/[-\s]+/g, ' ');
const configured = new Map(EXERCISE_CATALOG.map((exercise) => [normalize(exercise.name), exercise.category]));
export const configuredCategory = (name: string): ExerciseCategory | undefined => configured.get(normalize(name));
const savedGroups: Record<string, ExerciseCategory> = {
  back: 'Back', lats: 'Back', chest: 'Chest', pecs: 'Chest',
  shoulders: 'Arms', delts: 'Arms', arms: 'Arms', biceps: 'Arms', triceps: 'Arms', forearms: 'Arms',
  leg: 'Legs', legs: 'Legs', quads: 'Legs', quadriceps: 'Legs', hamstrings: 'Legs', glutes: 'Legs', calves: 'Legs',
  core: 'Core', abs: 'Core', abdominals: 'Core', compound: 'Compound',
};

/** Explicit categories win; older records retain saved labels or use configured names. */
export function muscleGroup(exercise?: Exercise, historicalName = ''): ExerciseCategory | 'Unspecified' {
  if (exercise?.category && EXERCISE_CATEGORIES.includes(exercise.category)) return exercise.category;
  const saved = exercise?.primaryMuscle?.trim().toLowerCase();
  return (saved && savedGroups[saved]) || configuredCategory(exercise?.name ?? '') || configuredCategory(historicalName) || 'Unspecified';
}

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
  { name: 'Crunches', category: 'Core' },
  { name: 'Cable Crunch', category: 'Core' },
  { name: 'Sit-ups', category: 'Core' },
  { name: 'Leg Raises', category: 'Core' },
  { name: 'Hanging Leg Raises', category: 'Core' },
  { name: 'Russian Twist', category: 'Core' },
  { name: 'Bicycle Crunch', category: 'Core' },
  { name: 'Reverse Crunch', category: 'Core' },
  { name: 'Barbell Curl', category: 'Arms' },
  { name: 'Dumbbell Curl', category: 'Arms' },
  { name: 'Cable Curl', category: 'Arms' },
  { name: 'Preacher Curl', category: 'Arms' },
  { name: 'Concentration Curl', category: 'Arms' },
  { name: 'Incline Dumbbell Curl', category: 'Arms' },
  { name: 'Triceps Pushdown', category: 'Arms' },
  { name: 'Rope Triceps Pushdown', category: 'Arms' },
  { name: 'Triceps Extension', category: 'Arms' },
  { name: 'Triceps Kickback', category: 'Arms' },
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
const normalize = (name: string) => name.trim().toLowerCase().replace(/[-\s]+/g, ' ')
  .replace(/\bdumbell\b/g, 'dumbbell').replace(/\btricep(?:es)?\b/g, 'triceps').replace(/\bbicep\b/g, 'biceps');
const aliases: Record<string, string> = {
  'barbell biceps curl': 'barbell curl', 'barbell curls': 'barbell curl',
  'dumbbell biceps curl': 'dumbbell curl', 'dumbbell curls': 'dumbbell curl',
  'biceps curl': 'dumbbell curl', 'biceps curls': 'dumbbell curl',
  'triceps extensions': 'triceps extension', 'cable triceps extension': 'triceps extension',
  'dumbbell triceps extension': 'overhead dumbbell triceps extension',
  'cable triceps pushdown': 'triceps pushdown', 'triceps cable pushdown': 'triceps pushdown',
  'rope pushdown': 'rope triceps pushdown', 'triceps rope pushdown': 'rope triceps pushdown',
  'skull crushers': 'ez bar skull crushers',
  crunch: 'crunches', 'cable crunches': 'cable crunch', 'sit up': 'sit ups',
  'leg raise': 'leg raises', 'hanging leg raise': 'hanging leg raises',
  'hanging knee raise': 'hanging knee raises', 'knee raises': 'hanging knee raises',
  'ab wheel': 'ab roller', 'ab wheel rollout': 'ab roller', 'ab rollouts': 'ab roller',
  'russian twists': 'russian twist', 'bicycle crunches': 'bicycle crunch', 'reverse crunches': 'reverse crunch',
};
/** Used for matching catalog display names only; actual exercise IDs are never merged. */
export const exerciseNameKey = (name: string) => aliases[normalize(name)] ?? normalize(name);
const configured = new Map(EXERCISE_CATALOG.map((exercise) => [exerciseNameKey(exercise.name), exercise.category]));
export const configuredCategory = (name: string): ExerciseCategory | undefined => configured.get(exerciseNameKey(name));
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

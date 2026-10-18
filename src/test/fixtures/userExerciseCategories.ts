import type { ExerciseCategory } from '@/types';

/** Actual plan names reported as missing from category charts. */
export const userExerciseCategories: [string, ExerciseCategory][] = [
  ['Reverse Fly', 'Back'], ['Pull-up', 'Back'], ['Barbell Row', 'Back'],
  ['Barbell Curl', 'Arms'], ['Dumbbell Rows', 'Back'], ['Hammer Curl', 'Arms'],
  ['Dumbbell curl', 'Arms'], ['Deadlift', 'Compound'],
  ['Push Up', 'Chest'], ['Bench Press', 'Chest'], ['Incline DB Press', 'Chest'],
  ['Overhead Press', 'Compound'], ['Lateral Raise', 'Arms'], ['Weighted Dips', 'Chest'],
  ['Single Arm Tricep Overhead Extension', 'Arms'], ['DB Fly', 'Chest'],
  ['Lateral Raises', 'Arms'], ['Barbell shoulder press', 'Compound'],
  ['Single-arm Tricep Extensions', 'Arms'], ['Dead Bugs', 'Core'],
  ['Barbell Skull Crusher', 'Arms'], ['Dumbbell Skull Crusher', 'Arms'],
  ['Squat', 'Legs'], ['Romanian Deadlift', 'Compound'], ['Lunges', 'Legs'],
  ['Calf Raise', 'Legs'], ['Sumo squats', 'Legs'],
];

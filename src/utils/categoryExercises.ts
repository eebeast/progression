import type { Exercise, ExerciseLog } from '@/types';
import { EXERCISE_CATALOG, exerciseNameKey, muscleGroup } from './muscleGroups';

export interface CategoryExercise { id?: string; name: string }

/** Full category catalog plus original logged identities, including missing legacy definitions. */
export function categoryExercises(category: string, exercises: Exercise[], logs: ExerciseLog[]): CategoryExercise[] {
  const definitions = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const categoryLogs = logs.filter((log) => muscleGroup(definitions.get(log.exerciseId), log.exerciseName) === category);
  const loggedIds = new Set(categoryLogs.map((log) => log.exerciseId));
  const rows: CategoryExercise[] = exercises.filter((exercise) =>
    (muscleGroup(exercise) === category || loggedIds.has(exercise.id)) && (!exercise.archivedAt || loggedIds.has(exercise.id)))
    .map(({ id, name }) => ({ id, name }));
  const ids = new Set(rows.map((exercise) => exercise.id));
  for (const log of categoryLogs) if (!ids.has(log.exerciseId) && !definitions.has(log.exerciseId)) {
    rows.push({ id: log.exerciseId, name: log.exerciseName }); ids.add(log.exerciseId);
  }
  const names = new Set([...exercises.map((exercise) => exerciseNameKey(exercise.name)), ...rows.map((exercise) => exerciseNameKey(exercise.name))]);
  for (const exercise of EXERCISE_CATALOG) if (exercise.category === category && !names.has(exerciseNameKey(exercise.name))) {
    rows.push({ name: exercise.name }); names.add(exerciseNameKey(exercise.name));
  }
  return rows.sort((a, b) => Number(loggedIds.has(b.id ?? '')) - Number(loggedIds.has(a.id ?? '')) || a.name.localeCompare(b.name));
}

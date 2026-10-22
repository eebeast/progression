import type { Exercise, ExerciseLog } from '@/types';
import { configuredCategory, exerciseNameKey, muscleGroup } from './muscleGroups';

/** Shared compatibility policy for catalog reuse and read-only history families. */
function catalogIdentity(exercise: Exercise): string | undefined {
  if (exercise.separateHistory || !configuredCategory(exercise.name)) return undefined;
  const name = exerciseNameKey(exercise.name);
  // Verified catalog names supply legacy equipment only when none was saved.
  const catalogEquipment = /\bbarbell\b/.test(name) ? 'barbell' : /\bdumbbell\b/.test(name) ? 'dumbbell' : '';
  const equipment = exercise.equipment?.trim().toLowerCase() || catalogEquipment;
  return JSON.stringify(['catalog', name, muscleGroup(exercise), equipment]);
}

/** Matching names may reuse an ID; this never rewrites or merges saved records. */
export function matchingExercises(exercises: Exercise[], name: string): Exercise[] {
  const known = configuredCategory(name) !== undefined;
  const key = known ? exerciseNameKey(name) : name.trim().toLowerCase();
  return exercises.filter((exercise) => !exercise.archivedAt &&
    (known ? exerciseNameKey(exercise.name) : exercise.name.trim().toLowerCase()) === key);
}

/** Reuse only one unambiguous movement family, including its already-recorded aliases. */
export function reusableExercise(exercises: Exercise[], name: string): Exercise | undefined {
  const matches = matchingExercises(exercises, name).filter((exercise) => !exercise.separateHistory);
  if (!matches.length) return undefined;
  const requested = catalogIdentity({ id: '', name, createdAt: 0 });
  if (requested && matches.some((exercise) => catalogIdentity(exercise) !== requested)) return undefined;
  const family = exerciseHistoryIds(matches).get(matches[0].id) ?? [];
  if (family.length !== matches.length) return undefined;
  return matches.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))[0];
}

/** Read-only families for verified catalog aliases. Unknown/distinct movements stay separate. */
export function exerciseHistoryIds(exercises: Exercise[], logs: ExerciseLog[] = []): Map<string, string[]> {
  const definitions = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const orphanNames = new Map<string, Set<string>>();
  for (const log of logs) if (!definitions.has(log.exerciseId)) {
    const names = orphanNames.get(log.exerciseId) ?? new Set<string>();
    names.add(typeof log.exerciseName === 'string' ? log.exerciseName : ''); orphanNames.set(log.exerciseId, names);
  }
  for (const [id, names] of orphanNames) {
    const keys = new Set([...names].map(exerciseNameKey));
    const name = [...names][0];
    definitions.set(id, { id, name, createdAt: 0, separateHistory: keys.size !== 1 });
  }

  const families = new Map<string, string[]>();
  for (const exercise of definitions.values()) {
    const key = catalogIdentity(exercise) ?? JSON.stringify(['exercise', exercise.id]);
    const family = families.get(key) ?? [];
    family.push(exercise.id); families.set(key, family);
  }
  const result = new Map<string, string[]>();
  for (const ids of families.values()) {
    ids.sort();
    for (const id of ids) result.set(id, ids);
  }
  return result;
}

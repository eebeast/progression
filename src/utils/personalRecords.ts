import type { ExerciseLog } from '@/types';

export interface Record {
  weight: number;
  reps: number;
}

/**
 * The personal record for a set of exercise logs (across any sessions),
 * ignoring warm-ups: the heaviest weight ever logged, and the most reps logged
 * at that exact weight. Records only — no 1RM estimate, no projection.
 *
 * Returns null when there are no working sets.
 */
export function getRecord(logs: ExerciseLog[]): Record | null {
  let best: Record | null = null;
  for (const log of logs) {
    if (log.isWarmup) continue;
    if (
      best === null ||
      log.weight > best.weight ||
      (log.weight === best.weight && log.reps > best.reps)
    ) {
      best = { weight: log.weight, reps: log.reps };
    }
  }
  return best;
}

export interface DatedSet {
  weight: number;
  reps: number;
  date: number;
  isWarmup?: boolean;
}

export interface TopSet {
  weight: number;
  reps: number;
  date: number;
}

/**
 * The best `limit` working sets ever for an exercise: distinct weight×reps
 * combos (keeping the most recent date each was performed), sorted heaviest
 * first, then most reps. Warm-ups excluded. Facts only — no estimates.
 */
export function getTopSets(sets: DatedSet[], limit = 4): TopSet[] {
  const byCombo = new Map<string, TopSet>();
  for (const s of sets) {
    if (s.isWarmup) continue;
    const key = `${s.weight}x${s.reps}`;
    const existing = byCombo.get(key);
    if (!existing || s.date > existing.date) {
      byCombo.set(key, { weight: s.weight, reps: s.reps, date: s.date });
    }
  }
  return [...byCombo.values()]
    .sort((a, b) => b.weight - a.weight || b.reps - a.reps)
    .slice(0, limit);
}

/**
 * The ids of every working set that set a NEW record at the moment it was
 * logged — i.e. it beat the best of all strictly-earlier working sets (by
 * timestamp). The very first working set establishes the baseline and is not
 * counted as "new". Derived live so edits/deletes stay consistent.
 */
export function getRecordSetIds(logs: ExerciseLog[]): Set<string> {
  const ids = new Set<string>();
  const working = logs.filter((l) => !l.isWarmup).sort((a, b) => a.timestamp - b.timestamp);
  let best: Record | null = null;
  for (const log of working) {
    if (best === null) {
      best = { weight: log.weight, reps: log.reps };
      continue;
    }
    const beatsWeight = log.weight > best.weight;
    const beatsReps = log.weight === best.weight && log.reps > best.reps;
    if (beatsWeight || beatsReps) {
      ids.add(log.id);
      best = { weight: log.weight, reps: log.reps };
    }
  }
  return ids;
}

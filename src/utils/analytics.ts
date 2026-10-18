import type { Exercise, ExerciseLog, Run, WorkoutSession } from '@/types';

export interface DateRange { from: number; to: number }
/** Local calendar boundaries; next-day construction handles 23/25-hour DST days. */
export function calendarRange(period: 'week' | 'month', now = new Date()): DateRange {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = new Date(from);
  if (period === 'week') { from.setDate(from.getDate() - (from.getDay() + 6) % 7); to.setTime(from.getTime()); to.setDate(to.getDate() + 7); }
  else { from.setDate(1); to.setTime(from.getTime()); to.setMonth(to.getMonth() + 1); }
  return { from: from.getTime(), to: to.getTime() };
}
export function dateInputValue(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function customRange(start: string, end: string): DateRange | null {
  const parse = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return dateInputValue(date.getTime()) === value ? date : null;
  };
  const from = parse(start); const to = parse(end);
  if (!from || !to || from > to) return null;
  to.setDate(to.getDate() + 1);
  return { from: from.getTime(), to: to.getTime() };
}
export const inRange = (timestamp: number, range: DateRange) => Number.isFinite(timestamp) && timestamp >= range.from && timestamp < range.to;

export function summarizeGym(sessions: WorkoutSession[], logs: ExerciseLog[], exercises: Exercise[], range: DateRange,
  filters: { exerciseId?: string; muscle?: string; templateId?: string } = {}) {
  const library = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const completed = sessions.filter((session) => session.status === 'completed' && inRange(session.date, range) && (!filters.templateId || session.templateId === filters.templateId));
  const ids = new Set(completed.map((session) => session.id));
  const sets = logs.filter((log) => ids.has(log.sessionId) && !log.isWarmup &&
    (!filters.exerciseId || log.exerciseId === filters.exerciseId) &&
    (!filters.muscle || (library.get(log.exerciseId)?.primaryMuscle?.trim() || 'Unspecified') === filters.muscle));
  const byMuscle = new Map<string, number>();
  const byExercise = new Map<string, { id: string; name: string; sets: number }>();
  for (const set of sets) {
    const muscle = library.get(set.exerciseId)?.primaryMuscle?.trim() || 'Unspecified';
    byMuscle.set(muscle, (byMuscle.get(muscle) ?? 0) + 1);
    const row = byExercise.get(set.exerciseId) ?? { id: set.exerciseId, name: library.get(set.exerciseId)?.name ?? set.exerciseName, sets: 0 };
    row.sets++; byExercise.set(set.exerciseId, row);
  }
  const sessionCount = filters.exerciseId || filters.muscle ? new Set(sets.map((set) => set.sessionId)).size : completed.length;
  return { sessions: sessionCount, workingSets: sets.length, byMuscle: [...byMuscle].sort(([a], [b]) => a.localeCompare(b)), byExercise: [...byExercise.values()].sort((a, b) => a.name.localeCompare(b.name)) };
}
export function summarizeRuns(runs: Run[], range: DateRange) {
  const selected = runs.filter((run) => inRange(run.date, range));
  const positive = (value: number) => Number.isFinite(value) && value > 0;
  const paired = selected.filter((run) => positive(run.distanceKm) && positive(run.durationSeconds));
  return {
    count: selected.length,
    distanceKm: selected.reduce((sum, run) => sum + (positive(run.distanceKm) ? run.distanceKm : 0), 0),
    durationSeconds: selected.reduce((sum, run) => sum + (positive(run.durationSeconds) ? run.durationSeconds : 0), 0),
    pairedDistanceKm: paired.reduce((sum, run) => sum + run.distanceKm, 0),
    pairedDurationSeconds: paired.reduce((sum, run) => sum + run.durationSeconds, 0),
    longestKm: Math.max(0, ...selected.filter((run) => positive(run.distanceKm)).map((run) => run.distanceKm)),
    incomplete: selected.filter((run) => !positive(run.distanceKm) || !positive(run.durationSeconds)).length,
  };
}

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

function selectGym(sessions: WorkoutSession[], logs: ExerciseLog[], exercises: Exercise[], range: DateRange,
  filters: { exerciseId?: string; muscle?: string; templateId?: string } = {}) {
  const library = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const completed = sessions.filter((session) => session.status === 'completed' && inRange(session.date, range) && (!filters.templateId || session.templateId === filters.templateId));
  const ids = new Set(completed.map((session) => session.id));
  const sets = logs.filter((log) => ids.has(log.sessionId) && !log.isWarmup &&
    (!filters.exerciseId || log.exerciseId === filters.exerciseId) &&
    (!filters.muscle || (library.get(log.exerciseId)?.primaryMuscle?.trim() || 'Unspecified') === filters.muscle));
  return { library, completed, sets };
}

export function summarizeGym(sessions: WorkoutSession[], logs: ExerciseLog[], exercises: Exercise[], range: DateRange,
  filters: { exerciseId?: string; muscle?: string; templateId?: string } = {}) {
  const { library, completed, sets } = selectGym(sessions, logs, exercises, range, filters);
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

export interface ActivityPoint {
  date: number;
  through: number;
  workouts: number;
  workingSets: number;
  distanceKm: number;
}

/** At most 31 calendar buckets, including empty days. Gym filters never filter runs. */
export function activityTimeline(sessions: WorkoutSession[], logs: ExerciseLog[], exercises: Exercise[], runs: Run[], range: DateRange,
  filters: { exerciseId?: string; muscle?: string; templateId?: string } = {}): ActivityPoint[] {
  if (!Number.isFinite(range.from) || !Number.isFinite(range.to) || range.to <= range.from) return [];
  const calendarDay = (timestamp: number) => {
    const date = new Date(timestamp);
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
  };
  const firstDay = calendarDay(range.from);
  const days = calendarDay(range.to - 1) - firstDay + 1;
  const step = Math.max(1, Math.ceil(days / 31));
  const points: ActivityPoint[] = [];
  for (let day = 0; day < days; day += step) {
    const date = new Date(range.from); date.setDate(date.getDate() + day);
    const next = new Date(date); next.setDate(next.getDate() + step);
    points.push({ date: date.getTime(), through: Math.min(next.getTime(), range.to) - 1, workouts: 0, workingSets: 0, distanceKm: 0 });
  }
  const pointFor = (timestamp: number) => points[Math.floor((calendarDay(timestamp) - firstDay) / step)];
  const { completed, sets } = selectGym(sessions, logs, exercises, range, filters);
  const matchingIds = new Set(sets.map((set) => set.sessionId));
  const dateBySession = new Map(completed.map((session) => [session.id, session.date]));
  for (const session of completed) {
    if (!filters.exerciseId && !filters.muscle || matchingIds.has(session.id)) pointFor(session.date).workouts++;
  }
  for (const set of sets) pointFor(dateBySession.get(set.sessionId)!).workingSets++;
  for (const run of runs) {
    if (inRange(run.date, range) && Number.isFinite(run.distanceKm) && run.distanceKm > 0) pointFor(run.date).distanceKm += run.distanceKm;
  }
  return points;
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

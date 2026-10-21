import type { Exercise, ExerciseLog, Run, WorkoutSession } from '@/types';
import { muscleGroup } from './muscleGroups';
import { EXERCISE_CATEGORIES } from './muscleGroups';
import { exerciseHistoryIds } from './exerciseHistory';

export interface DateRange { from: number; to: number }
/** Local calendar boundaries; next-day construction handles 23/25-hour DST days. */
export function calendarRange(period: 'week' | 'month' | 'year', now = new Date()): DateRange {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = new Date(from);
  if (period === 'week') { from.setDate(from.getDate() - (from.getDay() + 6) % 7); to.setTime(from.getTime()); to.setDate(to.getDate() + 7); }
  else if (period === 'month') { from.setDate(1); to.setTime(from.getTime()); to.setMonth(to.getMonth() + 1); }
  else { from.setMonth(0, 1); to.setTime(from.getTime()); to.setFullYear(to.getFullYear() + 1); }
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
  const selectedExercises = filters.exerciseId ? new Set(exerciseHistoryIds(exercises, logs).get(filters.exerciseId) ?? [filters.exerciseId]) : null;
  const sets = logs.filter((log) => ids.has(log.sessionId) && !log.isWarmup &&
    (!selectedExercises || selectedExercises.has(log.exerciseId)) &&
    (!filters.muscle || muscleGroup(library.get(log.exerciseId), log.exerciseName) === filters.muscle));
  return { library, completed, sets };
}

export function summarizeGym(sessions: WorkoutSession[], logs: ExerciseLog[], exercises: Exercise[], range: DateRange,
  filters: { exerciseId?: string; muscle?: string; templateId?: string } = {}) {
  const { library, completed, sets } = selectGym(sessions, logs, exercises, range, filters);
  const byMuscle = new Map<string, number>();
  const byExercise = new Map<string, { id: string; name: string; sets: number }>();
  for (const set of sets) {
    const muscle = muscleGroup(library.get(set.exerciseId), set.exerciseName);
    byMuscle.set(muscle, (byMuscle.get(muscle) ?? 0) + 1);
    const row = byExercise.get(set.exerciseId) ?? { id: set.exerciseId, name: library.get(set.exerciseId)?.name ?? set.exerciseName, sets: 0 };
    row.sets++; byExercise.set(set.exerciseId, row);
  }
  const sessionCount = filters.exerciseId || filters.muscle ? new Set(sets.map((set) => set.sessionId)).size : completed.length;
  return { sessions: sessionCount, workingSets: sets.length, byMuscle: [...byMuscle].sort(([a], [b]) => a.localeCompare(b)), byExercise: [...byExercise.values()].sort((a, b) => a.name.localeCompare(b.name)) };
}

export interface ActivityPoint {
  bucket: 'day' | 'days' | 'month' | 'months';
  date: number;
  through: number;
  workouts: number;
  workingSets: number;
  distanceKm: number;
}

/** Counts completed workouts per category; a mixed workout may appear in multiple rows. */
export function categoryActivity(sessions: WorkoutSession[], logs: ExerciseLog[], exercises: Exercise[], range: DateRange,
  filters: { exerciseId?: string; muscle?: string; templateId?: string } = {}) {
  const { library, sets } = selectGym(sessions, logs, exercises, range, filters);
  const groups = new Map<string, Set<string>>(EXERCISE_CATEGORIES.map((category) => [category, new Set<string>()]));
  const heaviest = new Map<string, number>();
  for (const set of sets) {
    const category = muscleGroup(library.get(set.exerciseId), set.exerciseName);
    if (category === 'Unspecified') continue;
    if (!groups.has(category)) groups.set(category, new Set());
    groups.get(category)!.add(set.sessionId);
    if (Number.isFinite(set.weight) && set.weight >= 0) heaviest.set(category, Math.max(heaviest.get(category) ?? 0, set.weight));
  }
  return [...groups].map(([category, ids]) => ({ category, workouts: ids.size, heaviestLoad: heaviest.get(category) ?? null }));
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
  const firstDate = new Date(range.from);
  const lastDate = new Date(range.to - 1);
  const monthly = days > 62;
  const months = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + lastDate.getMonth() - firstDate.getMonth() + 1;
  const count = monthly ? months : days;
  const step = Math.max(1, Math.ceil(count / 31));
  const points: ActivityPoint[] = [];
  for (let offset = 0; offset < count; offset += step) {
    const date = monthly && offset > 0 ? new Date(firstDate.getFullYear(), firstDate.getMonth() + offset, 1) : new Date(range.from);
    if (!monthly) date.setDate(date.getDate() + offset);
    const next = monthly ? new Date(firstDate.getFullYear(), firstDate.getMonth() + offset + step, 1) : new Date(date);
    if (!monthly) next.setDate(next.getDate() + step);
    points.push({ bucket: monthly ? step === 1 ? 'month' : 'months' : step === 1 ? 'day' : 'days', date: date.getTime(), through: Math.min(next.getTime(), range.to) - 1, workouts: 0, workingSets: 0, distanceKm: 0 });
  }
  const pointFor = (timestamp: number) => {
    const date = new Date(timestamp);
    const offset = monthly ? (date.getFullYear() - firstDate.getFullYear()) * 12 + date.getMonth() - firstDate.getMonth() : calendarDay(timestamp) - firstDay;
    return points[Math.floor(offset / step)];
  };
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

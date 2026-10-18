import type { ExerciseLog, WorkoutSession } from '@/types';

/** One point per recorded working set, across all completed history. No aggregation. */
export function exerciseSetLoads(logs: ExerciseLog[], sessions: WorkoutSession[], exerciseId: string) {
  const dates = new Map(sessions.filter((session) => session.status === 'completed' && Number.isFinite(session.date)).map((session) => [session.id, session.date]));
  return logs.filter((log) => log.exerciseId === exerciseId && dates.has(log.sessionId) && !log.isWarmup && Number.isFinite(log.weight) && log.weight >= 0)
    .sort((a, b) => dates.get(a.sessionId)! - dates.get(b.sessionId)! || (Number.isFinite(a.timestamp) ? a.timestamp : 0) - (Number.isFinite(b.timestamp) ? b.timestamp : 0) || a.setNumber - b.setNumber || a.id.localeCompare(b.id))
    .map((log) => ({ id: log.id, date: dates.get(log.sessionId)!, value: log.weight, setNumber: log.setNumber, reps: log.reps, metric: log.metric }));
}

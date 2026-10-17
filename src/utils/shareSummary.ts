import type { ExerciseLog, Feeling, Unit } from '@/types';
import { formatDate, formatDuration, formatSetValue } from '@/utils/format';

const FEELING_LABEL: Record<Feeling, string> = {
  good: 'Good',
  ok: 'OK',
  rough: 'Rough',
};

export interface RecapInput {
  templateName: string;
  date: number;
  durationMs: number;
  logs: ExerciseLog[];
  unit: Unit;
  feeling: Feeling | null;
  notes: string;
}

/**
 * A plain-text recap of a workout, working sets only. No estimates or advice —
 * just what was recorded. Shape:
 *
 *   {templateName} — {date}
 *   {duration} · {n} exercises · {m} sets
 *
 *   {Exercise}: {w}{unit}×{r}, {w}{unit}×{r}, …
 *
 *   Felt: {label}   (only if set)
 *   {notes}         (only if present)
 */
export function buildWorkoutRecap({
  templateName,
  date,
  durationMs,
  logs,
  unit,
  feeling,
  notes,
}: RecapInput): string {
  const working = logs.filter((l) => !l.isWarmup);

  // Group by exercise, preserving first-seen order.
  const order: string[] = [];
  const byExercise = new Map<string, { name: string; sets: ExerciseLog[] }>();
  for (const log of working) {
    let group = byExercise.get(log.exerciseId);
    if (!group) {
      group = { name: log.exerciseName, sets: [] };
      byExercise.set(log.exerciseId, group);
      order.push(log.exerciseId);
    }
    group.sets.push(log);
  }
  for (const group of byExercise.values()) {
    group.sets.sort((a, b) => a.setNumber - b.setNumber);
  }

  const lines: string[] = [];
  lines.push(`${templateName} — ${formatDate(date)}`);
  lines.push(`${formatDuration(durationMs)} · ${order.length} exercises · ${working.length} sets`);
  lines.push('');

  for (const id of order) {
    const group = byExercise.get(id)!;
    const sets = group.sets.map((s) => `${s.weight > 0 ? `${s.weight}${unit}×` : ''}${s.metric === 'time' ? formatSetValue(s.reps, s.metric) : s.reps}`).join(', ');
    lines.push(`${group.name}: ${sets}`);
  }

  const trimmedNotes = notes.trim();
  if (feeling || trimmedNotes) {
    lines.push('');
    if (feeling) lines.push(`Felt: ${FEELING_LABEL[feeling]}`);
    if (trimmedNotes) lines.push(trimmedNotes);
  }

  return lines.join('\n');
}

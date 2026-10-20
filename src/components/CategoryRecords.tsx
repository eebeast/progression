import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { categoryExercises } from '@/utils/categoryExercises';
import { exerciseSetLoads } from '@/utils/setLoads';
import { formatSetValue } from '@/utils/format';
import { OverviewChart } from './OverviewChart';
import type { Exercise, ExerciseLog, WorkoutSession } from '@/types';

export function CategoryRecords({ category, exercises, sessions, logs, unit }: {
  category: string; exercises: Exercise[]; sessions: WorkoutSession[]; logs: ExerciseLog[]; unit: string;
}) {
  const completedIds = new Set(sessions.filter((session) => session.status === 'completed').map((session) => session.id));
  const completedLogs = logs.filter((log) => completedIds.has(log.sessionId) && !log.isWarmup);
  const rows = categoryExercises(category, exercises, completedLogs).map((exercise) => {
    const points = exercise.id ? exerciseSetLoads(completedLogs, sessions, exercise.id) : [];
    return { ...exercise, points };
  });
  const recordedCount = rows.filter((exercise) => exercise.points.length > 0).length;
  return <section className="scroll-mt-20 rounded-xl border border-border bg-card p-5" aria-label={`${category} exercise records`}>
    <h2 className="text-lg font-semibold">{category} · Exercise records</h2>
    <p className="mt-1 text-xs text-muted-foreground">{rows.length} exercises · {recordedCount} with recorded loads. All completed history and all exercises, independent of dashboard filters. Warm-ups excluded.</p>
    <div className="mt-5 grid gap-4 md:grid-cols-2">{rows.map((exercise) => {
      const heaviest = exercise.points.length ? exercise.points.reduce((max, point) => Math.max(max, point.value), 0) : null;
      return <article key={exercise.id ?? `configured-${exercise.name}`} className="min-w-0 rounded-xl border border-border p-4">
        <h3 className="font-semibold">{exercise.id ? <Link to={`/exercise/${exercise.id}`} className="flex items-center justify-between gap-2 hover:text-primary"><span>{exercise.name}</span><ChevronRight className="h-4 w-4 shrink-0" /></Link> : exercise.name}</h3>
        {heaviest !== null ? <>
          <p className="mb-3 mt-2 text-sm text-muted-foreground">Heaviest recorded: <span className="font-semibold text-foreground">{heaviest} {unit}</span></p>
          <OverviewChart label="Set load" unit={unit} line perSet points={exercise.points.map((point) => ({ ...point, detail: `Set ${point.setNumber} · ${formatSetValue(point.reps, point.metric)}${point.metric === 'time' ? '' : ' reps'}` }))} />
          {heaviest === 0 && <p className="mt-2 text-xs text-muted-foreground">No added weight recorded. Reps or duration are available on each point.</p>}
        </> : <p className="mt-4 text-sm text-muted-foreground">No recorded working-set loads yet.</p>}
      </article>;
    })}</div>
    <Link className="mt-4 inline-block text-sm font-semibold text-primary" to="/templates">Add exercises in your day plan</Link>
    {category === 'Shoulder' && <p className="mt-4 text-xs text-muted-foreground">Includes shoulder isolation exercises. Overhead presses appear under Compound.</p>}
  </section>;
}

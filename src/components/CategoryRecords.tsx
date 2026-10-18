import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { EXERCISE_CATALOG, muscleGroup } from '@/utils/muscleGroups';
import { exerciseSetLoads } from '@/utils/setLoads';
import { formatSetValue } from '@/utils/format';
import { OverviewChart } from './OverviewChart';
import type { Exercise, ExerciseLog, WorkoutSession } from '@/types';

export function CategoryRecords({ category, exercises, sessions, logs, unit }: {
  category: string; exercises: Exercise[]; sessions: WorkoutSession[]; logs: ExerciseLog[]; unit: string;
}) {
  const library = exercises.filter((exercise) => (muscleGroup(exercise) === category || logs.some((log) => log.exerciseId === exercise.id && muscleGroup(exercise, log.exerciseName) === category)) && (!exercise.archivedAt || logs.some((log) => log.exerciseId === exercise.id)));
  // Include legacy logged exercises whose definitions are missing, keeping their original IDs.
  for (const log of logs) if (!exercises.some((exercise) => exercise.id === log.exerciseId) && !library.some((exercise) => exercise.id === log.exerciseId) && muscleGroup(undefined, log.exerciseName) === category) {
    library.push({ id: log.exerciseId, name: log.exerciseName, createdAt: 0 });
  }
  const names = new Set(exercises.map((exercise) => exercise.name.trim().toLowerCase()));
  const configured = EXERCISE_CATALOG.filter((exercise) => exercise.category === category && !names.has(exercise.name.toLowerCase()));
  return <section className="scroll-mt-20 rounded-xl border border-border bg-card p-5" aria-label={`${category} exercise records`}>
    <h2 className="text-lg font-semibold">{category} · Exercise records</h2><p className="mt-1 text-xs text-muted-foreground">Every recorded working-set load across all completed history. Gym filters apply; date filters do not. Warm-ups excluded.</p>
    <div className="mt-5 grid gap-4 md:grid-cols-2">{library.sort((a, b) => a.name.localeCompare(b.name)).map((exercise) => {
      const points = exerciseSetLoads(logs, sessions, exercise.id);
      const heaviest = points.length ? points.reduce((max, point) => Math.max(max, point.value), 0) : null;
      return <article key={exercise.id} className="min-w-0 rounded-xl border border-border p-4">
        <Link to={`/exercise/${exercise.id}`} className="flex items-center justify-between gap-2 font-semibold hover:text-primary"><span>{exercise.name}</span><ChevronRight className="h-4 w-4 shrink-0" /></Link>
        {heaviest !== null ? <><p className="mb-3 mt-2 text-sm text-muted-foreground">Heaviest recorded: <span className="font-semibold text-foreground">{heaviest} {unit}</span></p><OverviewChart label="Set load" unit={unit} line perSet points={points.map((point) => ({ ...point, detail: `Set ${point.setNumber} · ${formatSetValue(point.reps, point.metric)}${point.metric === 'time' ? '' : ' reps'}` }))} />{heaviest === 0 && <p className="mt-2 text-xs text-muted-foreground">No added weight recorded. Reps or duration are available on each point.</p>}</> : <p className="mt-4 text-sm text-muted-foreground">No recorded working-set loads yet.</p>}

      </article>;
    })}</div>
    {configured.length > 0 && <div className="mt-5"><h3 className="text-sm font-semibold">Preconfigured exercises</h3><div className="mt-3 flex flex-wrap gap-2">{configured.map((exercise) => <span key={exercise.name} className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{exercise.name}</span>)}</div><Link className="mt-3 inline-block text-sm font-semibold text-primary" to="/templates">Add exercises in your day plan</Link></div>}
    {category === 'Arms' && <p className="mt-4 text-xs text-muted-foreground">Includes shoulder isolation exercises. Overhead presses appear under Compound.</p>}
  </section>;
}

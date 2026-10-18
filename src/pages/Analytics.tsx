import * as React from 'react';
import { Link } from 'react-router-dom';
import { useRepo } from '@/storage/RepositoryProvider';
import { useObservable } from '@/hooks/useObservable';
import { useSettings } from '@/hooks/useSettings';
import { PageHeader } from '@/components/PageHeader';
import { calendarRange, customRange, dateInputValue, inRange, summarizeGym, summarizeRuns } from '@/utils/analytics';
import { formatDuration } from '@/utils/format';
import { formatPace } from '@/utils/runMetrics';

export default function Analytics() {
  const repo = useRepo(); const { settings } = useSettings();
  const sessions = useObservable(() => repo.observeCompletedSessions(), [repo]);
  const logs = useObservable(() => repo.observeAllLogs(), [repo]);
  const exercises = useObservable(() => repo.observeExercises(), [repo]);
  const templates = useObservable(() => repo.observeTemplates(), [repo]);
  const runs = useObservable(() => repo.observeRuns(), [repo]);
  const weights = useObservable(() => repo.observeBodyWeights(), [repo]);
  const [period, setPeriod] = React.useState<'week' | 'month' | 'custom'>('week');
  const [start, setStart] = React.useState(dateInputValue(Date.now())); const [end, setEnd] = React.useState(start);
  const [exerciseId, setExercise] = React.useState(''); const [muscle, setMuscle] = React.useState(''); const [templateId, setTemplate] = React.useState('');
  const range = period === 'custom' ? customRange(start, end) : calendarRange(period);
  if (!sessions || !logs || !exercises || !templates || !runs || !weights) return <p role="status" className="p-6">Loading recorded activity…</p>;
  const gym = range ? summarizeGym(sessions, logs, exercises, range, { exerciseId, muscle, templateId }) : null;
  const running = range ? summarizeRuns(runs, range) : null;
  const muscles = [...new Set(['Unspecified', ...exercises.map((e) => e.primaryMuscle?.trim()).filter((v): v is string => !!v)])].sort();
  const selectClass = 'rounded-lg border border-border bg-background p-2';
  return <div><PageHeader title="Activity overview" /><div className="mx-auto flex max-w-5xl flex-col gap-5 p-5">
    <label>Period<select className={`ml-2 ${selectClass}`} value={period} onChange={(e) => setPeriod(e.target.value as typeof period)}><option value="week">This week</option><option value="month">This month</option><option value="custom">Custom dates</option></select></label>
    {period === 'custom' && <div className="flex flex-wrap gap-3"><label>From<input className={selectClass} type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label><label>Through<input className={selectClass} type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></label></div>}
    {!range && <p role="alert">Choose valid dates with the end on or after the start.</p>}
    <div className="grid gap-3 sm:grid-cols-3">
      <label>Exercise<select className={`w-full ${selectClass}`} value={exerciseId} onChange={(e) => setExercise(e.target.value)}><option value="">All exercises</option>{exercises.map((e) => <option value={e.id} key={e.id}>{e.name}</option>)}</select></label>
      <label>Primary muscle<select className={`w-full ${selectClass}`} value={muscle} onChange={(e) => setMuscle(e.target.value)}><option value="">All muscles</option>{muscles.map((m) => <option key={m}>{m}</option>)}</select></label>
      <label>Plan<select className={`w-full ${selectClass}`} value={templateId} onChange={(e) => setTemplate(e.target.value)}><option value="">All plans</option>{[...new Map([...templates.map((t) => [t.id, t.name] as const), ...sessions.map((s) => [s.templateId, s.templateName] as const)]).entries()].map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></label>
    </div>
    <p className="text-xs text-muted-foreground">Exercise, muscle and plan filters apply to gym records. Weeks begin Monday in your local timezone.</p>
    {gym && running && <>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-border p-4"><h2 className="mb-3 font-semibold">Gym</h2><p>{gym.sessions} completed workouts</p><p>{gym.workingSets} working sets</p><p className="mt-2 text-xs text-muted-foreground">Working sets exclude warm-ups and active workouts. Zero-set completed workouts remain in the unfiltered workout count.</p></section>
        <section className="rounded-xl border border-border p-4"><h2 className="mb-3 font-semibold">Running</h2><p>{running.count} runs · {running.distanceKm.toFixed(2)} km</p><p>{formatDuration(running.durationSeconds * 1000)} recorded duration</p><p>Longest: {running.longestKm ? `${running.longestKm} km` : '—'}</p><p>Pace: {formatPace({ distanceKm: running.pairedDistanceKm, durationSeconds: running.pairedDurationSeconds })}</p><p className="mt-2 text-xs text-muted-foreground">Pace uses total duration divided by total distance only for runs with both values. {running.incomplete} runs have missing or invalid pace values.</p></section>
        <section className="rounded-xl border border-border p-4"><h2 className="mb-3 font-semibold">Primary-muscle working sets</h2>{gym.byMuscle.length ? <ul>{gym.byMuscle.map(([name, count]) => <li className="flex justify-between" key={name}><span>{name}</span><span>{count}</span></li>)}</ul> : <p>No working sets in this range.</p>}<p className="mt-2 text-xs text-muted-foreground">Each set counts once under the exercise's recorded primary muscle. Missing metadata is unspecified.</p></section>
        <section className="rounded-xl border border-border p-4"><h2 className="mb-3 font-semibold">Exercises</h2>{gym.byExercise.length ? gym.byExercise.map((e) => <Link className="flex justify-between py-1 text-primary" key={e.id} to={`/exercise/${e.id}`}><span>{e.name}</span><span>{e.sets} sets</span></Link>) : <p>No exercise records in this range.</p>}<p className="mt-2 text-xs text-muted-foreground">Open an exercise for its recorded top sets and session chart.</p></section>
      </div>
      <section className="rounded-xl border border-border p-4"><h2 className="mb-3 font-semibold">Body-weight entries</h2>{weights.filter((entry) => inRange(entry.date, range!)).length ? weights.filter((entry) => inRange(entry.date, range!)).map((entry) => <p key={entry.id}>{new Date(entry.date).toLocaleDateString()} · {entry.weight} {settings.unit}</p>) : <p>No measurements in this range.</p>}</section>
    </>}
  </div></div>;
}

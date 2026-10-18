import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Dumbbell, Footprints, Layers, Scale, SlidersHorizontal } from 'lucide-react';
import { useRepo } from '@/storage/RepositoryProvider';
import { useObservable } from '@/hooks/useObservable';
import { useSettings } from '@/hooks/useSettings';
import { PageHeader } from '@/components/PageHeader';
import { CategoryActivityChart } from '@/components/CategoryActivityChart';
import { CategoryRecords } from '@/components/CategoryRecords';
import { OverviewChart } from '@/components/OverviewChart';
import { ActivityStreakCard } from '@/components/ActivityStreakCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { activityTimeline, categoryActivity, calendarRange, customRange, dateInputValue, inRange, summarizeGym, summarizeRuns } from '@/utils/analytics';
import { formatDuration } from '@/utils/format';
import { formatPace } from '@/utils/runMetrics';
import { EXERCISE_CATEGORIES, muscleGroup } from '@/utils/muscleGroups';
import { activityStreaks, type StreakPeriod } from '@/utils/activityStreaks';

const panel = 'min-w-0 rounded-xl border border-border bg-card p-5';
const pill = (active: boolean) => cn('rounded-lg px-3 py-2 text-sm font-semibold transition-colors', active ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground');
const number = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });
const dateLabel = (date: number) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function EmptyChart({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-56 flex-col items-center justify-center rounded-lg bg-muted/40 px-6 text-center">
    <Layers className="mb-3 h-6 w-6 text-muted-foreground/60" aria-hidden="true" />
    <p className="text-sm text-muted-foreground">{children}</p>
  </div>;
}

export default function Analytics() {
  const repo = useRepo(); const { settings } = useSettings();
  const sessions = useObservable(() => repo.observeCompletedSessions(), [repo]);
  const logs = useObservable(() => repo.observeAllLogs(), [repo]);
  const exercises = useObservable(() => repo.observeExercises(), [repo]);
  const templates = useObservable(() => repo.observeTemplates(), [repo]);
  const runs = useObservable(() => repo.observeRuns(), [repo]);
  const weights = useObservable(() => repo.observeBodyWeights(), [repo]);
  const [period, setPeriod] = React.useState<'week' | 'month' | 'year' | 'custom'>('week');
  const [start, setStart] = React.useState(dateInputValue(Date.now())); const [end, setEnd] = React.useState(start);
  const [exerciseId, setExercise] = React.useState(''); const [muscle, setMuscle] = React.useState(''); const [templateId, setTemplate] = React.useState('');
  const [showFilters, setShowFilters] = React.useState(false);
  const [metric, setMetric] = React.useState<'workouts' | 'distanceKm'>('workouts');
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const recordsRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { recordsRef.current?.scrollIntoView?.({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }, [selectedCategory]);
  const [streakPeriod, setStreakPeriod] = React.useState<StreakPeriod>('week');
  const range = period === 'custom' ? customRange(start, end) : calendarRange(period);
  if (!sessions || !logs || !exercises || !templates || !runs || !weights) return <p role="status" className="p-6">Loading recorded activity…</p>;
  const filters = { exerciseId, muscle, templateId };
  const gym = range ? summarizeGym(sessions, logs, exercises, range, filters) : null;
  const running = range ? summarizeRuns(runs, range) : null;
  const timeline = range ? activityTimeline(sessions, logs, exercises, runs, range, filters) : [];
  const measurements = range ? weights.filter((entry) => inRange(entry.date, range)).sort((a, b) => a.date - b.date || a.createdAt - b.createdAt || a.id.localeCompare(b.id)) : [];
  const latest = measurements.at(-1);
  const muscles = EXERCISE_CATEGORIES;
  const filterCount = [exerciseId, muscle, templateId].filter(Boolean).length;
  const metricLabel = { workouts: 'Workouts', distanceKm: 'Running distance' }[metric];
  const chartHasData = timeline.some((point) => point[metric] > 0);
  const categories = range ? categoryActivity(sessions, logs, exercises, range, filters) : [];
  const recordSessions = sessions.filter((session) => session.status === 'completed' && (!templateId || session.templateId === templateId));
  const historicalCategories = categoryActivity(sessions, logs, exercises, { from: -Infinity, to: Infinity }, filters);
  const recordLogs = logs.filter((log) => (!exerciseId || log.exerciseId === exerciseId) && (!muscle || muscleGroup(exercises.find((exercise) => exercise.id === log.exerciseId), log.exerciseName) === muscle));
  const selectClass = 'mt-1.5 w-full rounded-lg border border-input bg-background p-2.5 text-foreground';
  return <div>
    <PageHeader title="Activity overview" left={<Link to="/activity" aria-label="Back to Activity" className="rounded-full p-2 text-muted-foreground hover:bg-muted"><ArrowLeft className="h-5 w-5" /></Link>} />
    <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-bold sm:text-3xl">Your activity</h1><p className="mt-1 text-sm text-muted-foreground">{range ? `${dateLabel(range.from)} – ${dateLabel(range.to - 1)}, ${new Date(range.to - 1).getFullYear()}` : 'Choose a date range'}</p></div>
        <div role="group" aria-label="Period" className="grid grid-cols-2 rounded-xl bg-muted p-1 sm:flex">
          {([['week', 'This week'], ['month', 'This month'], ['year', 'This year'], ['custom', 'Custom']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)} className={pill(period === value)}>{label}</button>)}
        </div>
      </div>
      {period === 'custom' && <div className="grid max-w-md grid-cols-2 gap-3"><label className="text-sm font-medium">From<Input className="mt-1.5" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label><label className="text-sm font-medium">Through<Input className="mt-1.5" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></label></div>}
      {!range && <p role="alert" className="text-sm text-destructive">Choose valid dates with the end on or after the start.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Completed workouts and recorded runs.</p>
        <Button variant="outline" size="sm" aria-expanded={showFilters} aria-controls="overview-filters" onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal className="h-4 w-4" />Gym filters{filterCount ? ` (${filterCount})` : ''}</Button>
      </div>
      {(showFilters || filterCount > 0) && <section id="overview-filters" aria-label="Gym filters" className={panel}>
        {showFilters && <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-medium">Exercise<select className={selectClass} value={exerciseId} onChange={(e) => setExercise(e.target.value)}><option value="">All exercises</option>{exercises.map((e) => <option value={e.id} key={e.id}>{e.name}</option>)}</select></label>
          <label className="text-sm font-medium">Muscle group<select className={selectClass} value={muscle} onChange={(e) => setMuscle(e.target.value)}><option value="">All groups</option>{muscles.map((m) => <option key={m}>{m}</option>)}</select></label>
          <label className="text-sm font-medium">Plan<select className={selectClass} value={templateId} onChange={(e) => setTemplate(e.target.value)}><option value="">All plans</option>{[...new Map([...templates.map((t) => [t.id, t.name] as const), ...sessions.map((s) => [s.templateId, s.templateName] as const)]).entries()].map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></label>
        </div>}
        <div className={cn('flex flex-wrap items-center justify-between gap-3', showFilters && 'mt-3')}><p className="text-xs text-muted-foreground">{filterCount ? `${filterCount} gym ${filterCount === 1 ? 'filter' : 'filters'} applied. ` : ''}Running and body weight always show all records in this period.</p>{filterCount > 0 && <button type="button" className="text-sm font-semibold text-primary" onClick={() => { setExercise(''); setMuscle(''); setTemplate(''); }}>Clear filters</button>}</div>
      </section>}
      {gym && running && <>
        <ActivityStreakCard streak={activityStreaks(sessions, runs, streakPeriod)} period={streakPeriod} onPeriodChange={setStreakPeriod} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Workouts', value: number(gym.sessions), detail: 'Completed in this period', icon: Dumbbell },
            { label: 'Categories trained', value: number(categories.filter((row) => row.workouts > 0).length), detail: 'From completed workouts', icon: Layers },
            { label: 'Running distance', value: number(running.distanceKm), suffix: 'km', detail: `${running.count} ${running.count === 1 ? 'run' : 'runs'} recorded`, icon: Footprints },
            { label: 'Latest body weight', value: latest ? number(latest.weight) : '—', suffix: latest ? settings.unit : '', detail: latest ? `Logged ${dateLabel(latest.date)}` : 'No entries in this period', icon: Scale },
          ].map(({ label, value, suffix, detail, icon: Icon }) => <section key={label} aria-label={label} className={cn(panel, 'p-4 sm:p-5')}>
            <div className="mb-5 flex items-center justify-between gap-2"><h2 className="text-sm font-medium text-muted-foreground">{label}</h2><Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /></div>
            <p className="text-3xl font-bold tabular-nums sm:text-4xl">{value}{suffix && <span className="ml-1.5 text-sm font-medium text-muted-foreground">{suffix}</span>}</p>
            <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
          </section>)}
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <section className={cn(panel, 'lg:col-span-2')} aria-label="Activity over time">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Activity over time</h2><p className="mt-1 text-xs text-muted-foreground">{{ day: 'Daily totals', days: 'Totals grouped across multiple days', month: 'Monthly totals', months: 'Totals grouped across multiple months' }[timeline[0]?.bucket ?? 'day']} · Weeks begin Monday</p></div>
              <div className="flex rounded-lg bg-muted p-1" role="group" aria-label="Chart metric">{([['workouts', 'Workouts'], ['distanceKm', 'Run km']] as const).map(([value, label]) => <button key={value} type="button" className={pill(metric === value)} aria-pressed={metric === value} onClick={() => setMetric(value)}>{label}</button>)}</div>
            </div>
            {chartHasData ? <OverviewChart points={timeline.map((point) => ({ ...point, value: point[metric] }))} label={metricLabel} unit={metric === 'distanceKm' ? 'km' : ''} /> : <EmptyChart>{metric === 'distanceKm' ? 'No running distance logged in this period.' : 'No completed workouts in this period.'}</EmptyChart>}
          </section>
          <section className={panel} aria-label="Running summary">
            <div className="flex items-center justify-between"><h2 className="font-semibold">Running</h2><Footprints className="h-5 w-5 text-primary" aria-hidden="true" /></div><p className="mt-1 text-xs text-muted-foreground">All runs in the selected period</p>
            <dl className="mt-5 divide-y divide-border">{[
              ['Runs logged', number(running.count)], ['Recorded time', formatDuration(running.durationSeconds * 1000)],
              ['Longest run', running.longestKm ? `${number(running.longestKm)} km` : '—'],
              ['Pace', formatPace({ distanceKm: running.pairedDistanceKm, durationSeconds: running.pairedDurationSeconds })],
            ].map(([label, value]) => <div className="flex items-center justify-between gap-2 py-3" key={label}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="text-sm font-semibold tabular-nums">{value}</dd></div>)}</dl>
            <p className="mt-3 text-xs text-muted-foreground">Pace uses recorded time and distance from runs with both values.{running.incomplete > 0 && ` ${running.incomplete} ${running.incomplete === 1 ? 'run has' : 'runs have'} incomplete pace data.`}</p>
          </section>
          <section className={cn(panel, 'lg:col-span-2')} aria-label="Category activity">
            <h2 className="font-semibold">Recorded load by category</h2><p className="mb-4 mt-1 text-xs text-muted-foreground">Heaviest logged set in each category · All history. Choose a category for every exercise’s set-by-set load graph.</p>
            <CategoryActivityChart unit={settings.unit} rows={historicalCategories} selected={selectedCategory} onSelect={setSelectedCategory} />
          </section>
          <section className={panel} aria-label="Body-weight history">
            <div className="mb-5"><h2 className="font-semibold">Body weight</h2><p className="mt-1 text-xs text-muted-foreground">{measurements.length} {measurements.length === 1 ? 'measurement' : 'measurements'} in this period · {settings.unit}</p></div>
            {measurements.length ? <OverviewChart points={measurements.map((entry) => ({ date: entry.date, value: entry.weight }))} label="Body weight" unit={settings.unit} line /> : <EmptyChart>No body-weight entries in this period. Add a measurement in Activity.</EmptyChart>}
          </section>
        </div>
        {selectedCategory && <div ref={recordsRef} className="scroll-mt-20"><CategoryRecords category={selectedCategory} exercises={exercises} sessions={recordSessions} logs={recordLogs} unit={settings.unit} /></div>}
        <Link to="/activity" className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 text-sm font-semibold hover:bg-muted/50">View or add activity<ChevronRight className="h-4 w-4 text-primary" /></Link>
      </>}
    </div>
  </div>;
}

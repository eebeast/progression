import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Dumbbell, History as HistoryIcon } from 'lucide-react';
import { useRepo } from '@/storage/RepositoryProvider';
import { useObservable } from '@/hooks/useObservable';
import { useSettings } from '@/hooks/useSettings';
import { PageHeader } from '@/components/PageHeader';
import { RunRow } from '@/components/RunRow';
import { BodyWeightRow } from '@/components/BodyWeightSection';
import { LogCard } from '@/components/LogCard';
import { EmptyState } from '@/components/FeelingPicker';
import { formatDate, formatDuration } from '@/utils/format';
import { dateKey } from '@/utils/activity';
import { customRange } from '@/utils/analytics';
import { cn } from '@/lib/utils';
import type { BodyWeightEntry, Run, WorkoutSession } from '@/types';

type HistoryItem =
  | { kind: 'exercise'; date: number; sort: number; id: string; session: WorkoutSession }
  | { kind: 'run'; date: number; sort: number; id: string; run: Run }
  | { kind: 'weight'; date: number; sort: number; id: string; entry: BodyWeightEntry };
const FILTERS = [['all', 'All'], ['exercise', 'Exercises'], ['run', 'Runs'], ['cycle', 'Cycles'], ['weight', 'Body weight']] as const;

export default function HistoryPage() {
  const navigate = useNavigate(); const repo = useRepo(); const { settings } = useSettings();
  const [params, setParams] = useSearchParams();
  const requestedType = params.get('type') ?? 'all';
  const type = FILTERS.some(([value]) => value === requestedType) ? requestedType : 'all';
  const requestedDate = params.get('date');
  const date = requestedDate && customRange(requestedDate, requestedDate) ? requestedDate : null;
  const sessions = useObservable(() => repo.observeCompletedSessions(), [repo]);
  const runs = useObservable(() => repo.observeRuns(), [repo]);
  const weights = useObservable(() => repo.observeBodyWeights(), [repo]);
  const items = React.useMemo<HistoryItem[]>(() => [
    ...(sessions ?? []).map((session): HistoryItem => ({ kind: 'exercise', date: session.date, sort: session.startTime, id: session.id, session })),
    ...(runs ?? []).map((run): HistoryItem => ({ kind: 'run', date: run.date, sort: run.createdAt, id: run.id, run })),
    ...(weights ?? []).map((entry): HistoryItem => ({ kind: 'weight', date: entry.date, sort: entry.createdAt, id: entry.id, entry })),
  ].sort((a, b) => b.date - a.date || b.sort - a.sort || a.id.localeCompare(b.id)), [sessions, runs, weights]);
  const visible = items.filter((item) => (type === 'all' || item.kind === type) && (!date || dateKey(item.date) === date));
  return <div>
    <PageHeader title="Logbook" />
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5">
      <div role="group" aria-label="Record type" className="flex flex-wrap gap-2">{FILTERS.map(([value, label]) => <button key={value} type="button" aria-pressed={type === value} onClick={() => { const next = new URLSearchParams(params); next.set('type', value); setParams(next); }} className={cn('rounded-lg border px-4 py-2 text-sm font-semibold', type === value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:text-foreground')}>{label}</button>)}</div>
      {date && <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"><span>Records for {date}</span><button className="font-semibold text-primary" onClick={() => { const next = new URLSearchParams(params); next.delete('date'); setParams(next); }}>Show all dates</button></div>}
      {!sessions || !runs || !weights ? <p role="status">Loading records…</p> : !visible.length ? <EmptyState icon={<HistoryIcon className="h-9 w-9" />} title={type === 'all' && !date ? 'Nothing logged yet' : 'No matching records'} description={type === 'cycle' ? 'No cycling records yet. Cycling entry is not available yet.' : 'Saved workouts, runs and body weight appear here. Add new activity from Today.'} /> : <div role="list" aria-label="Logbook records" className="grid items-start gap-3 md:grid-cols-2">
        {visible.map((item) => <div role="listitem" key={`${item.kind}-${item.id}`}>
          {item.kind === 'exercise' ? <LogCard icon={<Dumbbell className="h-4 w-4" />} title={item.session.templateName} subtitle={`${formatDate(item.session.date)} · ${formatDuration((item.session.endTime ?? item.session.startTime) - item.session.startTime)}`} feeling={item.session.feeling} onClick={() => navigate(`/history/${item.session.id}`)} />
            : item.kind === 'run' ? <RunRow run={item.run} showDate onSave={(patch) => repo.updateRun(item.run.id, patch)} onDelete={() => repo.deleteRun(item.run.id)} />
              : <BodyWeightRow entry={item.entry} unit={settings.unit} onSave={(patch) => repo.updateBodyWeight(item.entry.id, patch)} onDelete={() => repo.deleteBodyWeight(item.entry.id)} />}
        </div>)}
      </div>}
    </div>
  </div>;
}

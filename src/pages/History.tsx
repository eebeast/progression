import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, History as HistoryIcon } from 'lucide-react';
import { useRepo } from '@/storage/RepositoryProvider';
import { useObservable } from '@/hooks/useObservable';
import { PageHeader } from '@/components/PageHeader';
import { RunRow } from '@/components/RunRow';
import { EmptyState, FEELING_EMOJI } from '@/components/FeelingPicker';
import { formatDate, formatDuration } from '@/utils/format';
import type { Run, WorkoutSession } from '@/types';

type HistoryItem =
  | { kind: 'workout'; date: number; sort: number; session: WorkoutSession }
  | { kind: 'run'; date: number; sort: number; run: Run };

export default function HistoryPage() {
  const navigate = useNavigate();
  const repo = useRepo();
  const sessions =
    useObservable(() => repo.observeCompletedSessions(), [repo]) ?? ([] as WorkoutSession[]);
  const runs = useObservable(() => repo.observeRuns(), [repo]) ?? ([] as Run[]);

  // Lifts and runs interleaved, most recent first (tie-break on the finer timestamp).
  const items = React.useMemo<HistoryItem[]>(() => {
    const merged: HistoryItem[] = [
      ...sessions.map((s): HistoryItem => ({ kind: 'workout', date: s.date, sort: s.startTime, session: s })),
      ...runs.map((r): HistoryItem => ({ kind: 'run', date: r.date, sort: r.createdAt, run: r })),
    ];
    return merged.sort((a, b) => b.date - a.date || b.sort - a.sort);
  }, [sessions, runs]);

  return (
    <div>
      <PageHeader title="History" />

      <div className="mx-auto w-full max-w-md md:max-w-2xl lg:max-w-3xl xl:max-w-4xl">
        {items.length === 0 ? (
          <EmptyState
            icon={<HistoryIcon className="h-10 w-10" />}
            title="Nothing logged yet"
            description="Once you finish a workout or log a run, it'll show up here."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 px-4 py-4 md:grid-cols-2">
            {items.map((item) =>
              item.kind === 'workout' ? (
                <button
                  key={item.session.id}
                  type="button"
                  onClick={() => navigate(`/history/${item.session.id}`)}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left hover:bg-muted/50"
                >
                  <div>
                    <p className="font-semibold">{item.session.templateName}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(item.session.date)} ·{' '}
                      {formatDuration((item.session.endTime ?? item.session.startTime) - item.session.startTime)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.session.feeling && (
                      <span className="text-xl">{FEELING_EMOJI[item.session.feeling]}</span>
                    )}
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </button>
              ) : (
                <RunRow
                  key={item.run.id}
                  run={item.run}
                  showDate
                  onSave={(patch) => repo.updateRun(item.run.id, patch)}
                  onDelete={() => repo.deleteRun(item.run.id)}
                />
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

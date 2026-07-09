import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, History as HistoryIcon } from 'lucide-react';
import { useRepo } from '@/storage/RepositoryProvider';
import { useObservable } from '@/hooks/useObservable';
import { PageHeader } from '@/components/PageHeader';
import { RunRow } from '@/components/RunRow';
import { LogCard } from '@/components/LogCard';
import { EmptyState } from '@/components/FeelingPicker';
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
                <LogCard
                  key={item.session.id}
                  icon={<Dumbbell className="h-4 w-4" />}
                  title={item.session.templateName}
                  subtitle={`${formatDate(item.session.date)} · ${formatDuration(
                    (item.session.endTime ?? item.session.startTime) - item.session.startTime,
                  )}`}
                  feeling={item.session.feeling}
                  onClick={() => navigate(`/history/${item.session.id}`)}
                />
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

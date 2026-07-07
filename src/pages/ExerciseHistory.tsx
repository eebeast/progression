import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRepo } from '@/storage/RepositoryProvider';
import { useObservable } from '@/hooks/useObservable';
import { useSettings } from '@/hooks/useSettings';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/FeelingPicker';
import { getRecord } from '@/utils/personalRecords';
import { formatDate } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { ExerciseLog, WorkoutSession } from '@/types';

/** A reverse-chronological drill-down of every session that logged an exercise. */
export default function ExerciseHistory() {
  const { exerciseId = '' } = useParams();
  const navigate = useNavigate();
  const repo = useRepo();
  const { settings } = useSettings();

  const logs =
    useObservable(() => repo.observeExerciseLogs(exerciseId), [repo, exerciseId]) ??
    ([] as ExerciseLog[]);
  const sessions =
    useObservable(() => repo.observeCompletedSessions(), [repo]) ?? ([] as WorkoutSession[]);

  const exerciseName = logs[0]?.exerciseName ?? 'Exercise';
  const record = React.useMemo(() => getRecord(logs), [logs]);

  // One card per completed session that logged this exercise, most recent first.
  const entries = React.useMemo(() => {
    const sessionById = new Map(sessions.map((s) => [s.id, s]));
    const bySession = new Map<string, ExerciseLog[]>();
    for (const log of logs) {
      if (!sessionById.has(log.sessionId)) continue; // skip active/unknown sessions
      const arr = bySession.get(log.sessionId) ?? [];
      arr.push(log);
      bySession.set(log.sessionId, arr);
    }
    return [...bySession.entries()]
      .map(([sessionId, sets]) => ({
        session: sessionById.get(sessionId)!,
        sets: [...sets].sort((a, b) => a.setNumber - b.setNumber),
      }))
      .sort((a, b) => b.session.date - a.session.date);
  }, [logs, sessions]);

  return (
    <div>
      <PageHeader
        left={
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        }
        title={exerciseName}
      />

      <div className="mx-auto flex max-w-2xl flex-col gap-5 px-5 py-5">
        {/* Current record — facts only */}
        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Personal record
          </p>
          {record ? (
            <p className="mt-1 text-xl font-bold tabular-nums">
              🏆 {record.weight}
              {settings.unit} × {record.reps}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">No working sets logged yet.</p>
          )}
        </div>

        {entries.length === 0 ? (
          <EmptyState title="No sessions yet" description="This exercise hasn't been logged." />
        ) : (
          <div className="flex flex-col gap-3">
            {entries.map(({ session, sets }) => (
              <button
                key={session.id}
                type="button"
                onClick={() => navigate(`/history/${session.id}`)}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{session.templateName}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(session.date)}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm tabular-nums">
                  {(() => {
                    let working = 0;
                    return sets.map((s) => {
                      if (!s.isWarmup) working += 1;
                      return (
                        <span
                          key={s.id}
                          className={cn(s.isWarmup && 'text-muted-foreground')}
                          title={s.isWarmup ? 'Warm-up' : `Set ${working}`}
                        >
                          {s.isWarmup && <span className="mr-0.5 text-xs">W</span>}
                          {s.weight}
                          {settings.unit} × {s.reps}
                        </span>
                      );
                    });
                  })()}
                </div>
              </button>
            ))}
          </div>
        )}

        <Button variant="ghost" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>
    </div>
  );
}

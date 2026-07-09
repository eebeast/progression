import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useRepo } from '@/storage/RepositoryProvider';
import { useObservable } from '@/hooks/useObservable';
import { useSettings } from '@/hooks/useSettings';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { getRecord, getSessionProgress, getTopSets, type DatedSet } from '@/utils/personalRecords';
import { ExerciseProgressChart } from '@/components/ExerciseProgressChart';
import { formatDate } from '@/utils/format';
import type { ExerciseLog, WorkoutSession } from '@/types';

/** An exercise's personal record and its best sets, most impressive first. */
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

  const dateBySession = React.useMemo(
    () => new Map(sessions.map((s) => [s.id, s.date])),
    [sessions],
  );

  // The best sets ever, each dated by the completed session that logged it.
  const topSets = React.useMemo(() => {
    const dated: DatedSet[] = [];
    for (const log of logs) {
      const date = dateBySession.get(log.sessionId);
      if (date === undefined) continue; // needs a completed-session date
      dated.push({ weight: log.weight, reps: log.reps, date, isWarmup: log.isWarmup });
    }
    return getTopSets(dated, 4);
  }, [logs, dateBySession]);

  // One point per session for the progress chart, chronological.
  const progress = React.useMemo(
    () => getSessionProgress(logs, dateBySession),
    [logs, dateBySession],
  );

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
        {/* Personal record — facts only */}
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

        {/* Progress — one point per session; facts only, no trend line */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Progress
          </p>
          <ExerciseProgressChart points={progress} unit={settings.unit} />
        </div>

        {/* Top sets — the best efforts, with the date each was performed */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Top sets
          </p>
          {topSets.length > 0 ? (
            <div className="flex flex-col gap-2">
              {topSets.map((s) => (
                <div
                  key={`${s.weight}x${s.reps}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
                >
                  <span className="text-lg font-semibold tabular-nums">
                    {s.weight}
                    {settings.unit} × {s.reps}
                  </span>
                  <span className="text-sm text-muted-foreground">{formatDate(s.date)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No completed sets yet.</p>
          )}
        </div>

        <Button variant="ghost" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>
    </div>
  );
}

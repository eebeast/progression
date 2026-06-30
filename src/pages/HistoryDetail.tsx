import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Trash2 } from 'lucide-react';
import { useRepo } from '@/storage/RepositoryProvider';
import { useObservable } from '@/hooks/useObservable';
import { useSettings } from '@/hooks/useSettings';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { FEELING_EMOJI } from '@/components/FeelingPicker';
import { formatDuration, formatLongDate } from '@/utils/format';
import type { ExerciseLog } from '@/types';

export default function HistoryDetail() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const repo = useRepo();
  const { settings } = useSettings();

  const session = useObservable(() => repo.observeSession(sessionId), [repo, sessionId]);
  const logs =
    useObservable(() => repo.observeSessionLogs(sessionId), [repo, sessionId]) ??
    ([] as ExerciseLog[]);
  const [confirm, setConfirm] = React.useState(false);

  const grouped = React.useMemo(() => {
    const map = new Map<string, { name: string; sets: ExerciseLog[] }>();
    for (const log of logs) {
      const g = map.get(log.exerciseId) ?? { name: log.exerciseName, sets: [] };
      g.sets.push(log);
      map.set(log.exerciseId, g);
    }
    for (const g of map.values()) g.sets.sort((a, b) => a.setNumber - b.setNumber);
    return [...map.values()];
  }, [logs]);

  if (session === undefined) return <div className="min-h-[100dvh] bg-background" />;
  if (!session) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Workout not found.
        <Button className="mt-4" onClick={() => navigate('/history')}>
          Back to history
        </Button>
      </div>
    );
  }

  const duration = formatDuration((session.endTime ?? session.startTime) - session.startTime);

  const remove = async () => {
    await repo.deleteSession(sessionId);
    navigate('/history', { replace: true });
  };

  return (
    <div>
      <PageHeader
        left={
          <button
            type="button"
            aria-label="Back to history"
            onClick={() => navigate('/history')}
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        }
        title={session.templateName}
      />

      <div className="mx-auto flex max-w-2xl flex-col gap-5 px-5 py-5">
        <div>
          <p className="text-sm text-muted-foreground">{formatLongDate(session.date)}</p>
          <div className="mt-1 flex items-center gap-3 text-sm">
            <span className="font-semibold tabular-nums">{duration}</span>
            {session.feeling && (
              <span className="text-lg">{FEELING_EMOJI[session.feeling]}</span>
            )}
          </div>
          {session.notes && (
            <p className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-sm">
              {session.notes}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {grouped.map((g) => (
            <div key={g.name}>
              <h3 className="mb-1.5 font-semibold">{g.name}</h3>
              <div className="flex flex-col gap-1">
                {g.sets.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm tabular-nums"
                  >
                    <span className="text-muted-foreground">Set {s.setNumber}</span>
                    <span className="font-medium">
                      {s.weight}
                      {settings.unit} × {s.reps}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {confirm ? (
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" className="flex-1" onClick={remove}>
              Delete workout
            </Button>
          </div>
        ) : (
          <Button variant="ghost" className="text-destructive" onClick={() => setConfirm(true)}>
            <Trash2 className="h-4 w-4" />
            Delete workout
          </Button>
        )}
      </div>
    </div>
  );
}

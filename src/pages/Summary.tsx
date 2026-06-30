import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRepo } from '@/storage/RepositoryProvider';
import { useObservable } from '@/hooks/useObservable';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FeelingPicker } from '@/components/FeelingPicker';
import { formatDuration } from '@/utils/format';
import type { ExerciseLog, Feeling } from '@/types';

export default function Summary() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const repo = useRepo();

  const session = useObservable(() => repo.observeSession(sessionId), [repo, sessionId]);
  const logs =
    useObservable(() => repo.observeSessionLogs(sessionId), [repo, sessionId]) ??
    ([] as ExerciseLog[]);

  const [feeling, setFeeling] = React.useState<Feeling | null>(null);
  const [notes, setNotes] = React.useState('');
  const seeded = React.useRef(false);

  // Freeze the clock on arrival.
  React.useEffect(() => {
    repo.endSessionClock(sessionId);
  }, [repo, sessionId]);

  // Seed local fields from the session once.
  React.useEffect(() => {
    if (session && !seeded.current) {
      setFeeling(session.feeling);
      setNotes(session.notes);
      seeded.current = true;
    }
  }, [session]);

  if (session === undefined) {
    return <div className="min-h-[100dvh] bg-background" />;
  }
  if (!session) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Session not found.
        <Button className="mt-4" onClick={() => navigate('/')}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  const duration = formatDuration((session.endTime ?? Date.now()) - session.startTime);
  const exercisesCompleted = new Set(logs.map((l) => l.exerciseId)).size;
  const totalSets = logs.length;

  const finish = async () => {
    await repo.finishSession(sessionId, { notes, feeling });
    navigate('/', { replace: true });
  };

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <PageHeader title="Workout complete" />

      <div className="flex flex-col gap-6 px-5 py-5">
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Duration" value={duration} />
          <Stat label="Exercises" value={String(exercisesCompleted)} />
          <Stat label="Sets" value={String(totalSets)} />
        </div>

        <div className="flex flex-col gap-3">
          <Label>How did it feel?</Label>
          <FeelingPicker value={feeling} onChange={setFeeling} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything worth remembering…"
          />
        </div>

        <Button size="lg" onClick={finish}>
          Finish
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card py-4">
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check, SkipForward, Flag } from 'lucide-react';
import { useRepo } from '@/storage/RepositoryProvider';
import { useObservable } from '@/hooks/useObservable';
import { of, type LastPerformed } from '@/storage/repository';
import { useSettings } from '@/hooks/useSettings';
import { PageHeader } from '@/components/PageHeader';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/Stepper';
import { SetList } from '@/components/SetList';
import { WarmupToggle } from '@/components/WarmupToggle';
import { getRecord, getRecordSetIds } from '@/utils/personalRecords';
import { formatSetValue } from '@/utils/format';
import type { ExerciseLog, Metric, TemplateExercise, WorkoutTemplate } from '@/types';

export default function Workout() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const repo = useRepo();
  const { settings } = useSettings();

  const session = useObservable(() => repo.observeSession(sessionId), [repo, sessionId]);
  const templateId = session?.templateId;
  const template = useObservable(
    () => (templateId ? repo.observeTemplate(templateId) : of<WorkoutTemplate | undefined>(undefined)),
    [repo, templateId],
  );
  const allLogs =
    useObservable(() => repo.observeSessionLogs(sessionId), [repo, sessionId]) ??
    ([] as ExerciseLog[]);

  const exercises = React.useMemo<TemplateExercise[]>(
    () => (template ? [...template.exercises].sort((a, b) => a.order - b.order) : []),
    [template],
  );

  const [index, setIndex] = React.useState(0);
  const current = exercises[index];

  // Per-session set of exercises the user has explicitly started.
  const [started, setStarted] = React.useState<Set<string>>(new Set());

  // Stepper state.
  const [weight, setWeight] = React.useState(0);
  const [reps, setReps] = React.useState(0);
  // When on, the next saved set is tagged as a warm-up. Sticky until toggled off.
  const [warmup, setWarmup] = React.useState(false);

  // Green flash for the most recently saved set.
  const [flashId, setFlashId] = React.useState<string | null>(null);

  const currentLogs = React.useMemo(
    () =>
      current
        ? allLogs
            .filter((l) => l.exerciseId === current.exerciseId)
            .sort((a, b) => a.setNumber - b.setNumber)
        : [],
    [allLogs, current],
  );

  // All sets for this exercise across every session — drives the record and the
  // per-set "New PR" badges. Derived live so edits/deletes stay consistent.
  const exerciseLogs =
    useObservable(
      () => (current ? repo.observeExerciseLogs(current.exerciseId) : of<ExerciseLog[]>([])),
      [repo, current?.exerciseId],
    ) ?? ([] as ExerciseLog[]);
  const record = React.useMemo(() => getRecord(exerciseLogs), [exerciseLogs]);
  const prIds = React.useMemo(() => getRecordSetIds(exerciseLogs), [exerciseLogs]);

  // Last workout is a one-shot read; refetch when the exercise changes.
  const [lastWorkout, setLastWorkout] = React.useState<LastPerformed | null>(null);
  React.useEffect(() => {
    if (!current) {
      setLastWorkout(null);
      return;
    }
    let cancelled = false;
    repo.getLastPerformedSets(current.exerciseId, sessionId).then((r) => {
      if (!cancelled) setLastWorkout(r);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, current?.exerciseId, sessionId]);

  const isStarted = current ? started.has(current.exerciseId) || currentLogs.length > 0 : false;
  // Only working sets count toward the target.
  const workingSetCount = currentLogs.filter((l) => !l.isWarmup).length;
  const targetMet = current ? workingSetCount >= current.targetSets : false;
  const metric: Metric = current?.metric ?? 'reps';

  // Pre-fill weight and reps when the exercise changes: last set this session,
  // else the matching set from the last workout. Depend on `lastWorkout` itself
  // (not its session id) so we re-run when the async refetch resolves — two
  // exercises from the same past session share a session id, and only guarding
  // on that would leave the previous exercise's values stuck here.
  React.useEffect(() => {
    if (!current) return;
    if (currentLogs.length > 0) {
      const last = currentLogs[currentLogs.length - 1];
      setWeight(last.weight);
      setReps(last.reps);
    } else if (
      lastWorkout &&
      lastWorkout.sets.length > 0 &&
      lastWorkout.sets[0].exerciseId === current.exerciseId
    ) {
      setWeight(lastWorkout.sets[0].weight);
      setReps(lastWorkout.sets[0].reps);
    } else {
      setWeight(0);
      setReps(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.exerciseId, lastWorkout]);

  // Flash the newest set once the live logs reflect a just-saved set.
  const pendingFlash = React.useRef(false);
  const prevLogCount = React.useRef(0);
  React.useEffect(() => {
    if (pendingFlash.current && currentLogs.length > prevLogCount.current) {
      pendingFlash.current = false;
      const id = currentLogs[currentLogs.length - 1].id;
      setFlashId(id);
      setTimeout(() => setFlashId((f) => (f === id ? null : f)), 700);
    }
    prevLogCount.current = currentLogs.length;
  }, [currentLogs]);

  const totalTarget = React.useMemo(
    () => exercises.reduce((sum, e) => sum + e.targetSets, 0),
    [exercises],
  );
  // Warm-up sets don't count toward the workout-level progress bar.
  const completedSets = allLogs.filter((l) => !l.isWarmup).length;
  const progressPct = totalTarget > 0 ? (completedSets / totalTarget) * 100 : 0;

  if (session === undefined || template === undefined) {
    return <div className="min-h-[100dvh] bg-background" />;
  }
  if (!session) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Workout not found.
        <Button className="mt-4" onClick={() => navigate('/')}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  const startExercise = () => {
    if (!current) return;
    setStarted((prev) => new Set(prev).add(current.exerciseId));
  };

  const saveSet = async () => {
    if (!current || reps <= 0) return;
    pendingFlash.current = true;
    await repo.addSet({
      sessionId,
      exerciseId: current.exerciseId,
      exerciseName: current.name,
      weight,
      reps,
      metric,
      isWarmup: warmup,
    });
    // Keep both weight and reps pre-filled, ready to repeat the same set.
  };

  const goTo = (i: number) => {
    setIndex(Math.max(0, Math.min(exercises.length - 1, i)));
  };

  const isLast = index === exercises.length - 1;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <PageHeader
        left={
          <button
            type="button"
            aria-label="Back to dashboard"
            onClick={() => navigate('/')}
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        }
        title={template.name}
        right={
          <button
            type="button"
            onClick={() => navigate(`/summary/${sessionId}`)}
            className="px-1 text-sm font-semibold text-primary"
          >
            Finish
          </button>
        }
      >
        <div className="px-3 pb-2">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Exercise {index + 1} of {exercises.length}
            </span>
            <span className="tabular-nums">
              {completedSets}/{totalTarget} sets
            </span>
          </div>
          <Progress value={progressPct} />
        </div>
      </PageHeader>

      {!current ? (
        <div className="p-6 text-center text-muted-foreground">This plan has no exercises.</div>
      ) : (
        <div className="flex flex-1 flex-col gap-4 px-4 py-4">
          {/* Exercise navigation + name */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous exercise"
              disabled={index === 0}
              onClick={() => goTo(index - 1)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex-1 text-center">
              <button
                type="button"
                onClick={() => navigate(`/exercise/${current.exerciseId}`)}
                className="mx-auto inline-flex items-center gap-1 text-xl font-bold leading-tight hover:text-primary"
              >
                {current.name}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              <div className="mt-1 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <span>
                  {current.targetSets} sets · {current.targetRepRange} {metric === 'time' ? 'sec' : 'reps'}
                </span>
                {targetMet && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
                    <Check className="h-3 w-3" />
                    Target met
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              aria-label="Next exercise"
              disabled={isLast}
              onClick={() => goTo(index + 1)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Last workout */}
          <div className="rounded-xl border border-border bg-muted/40 p-3">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Last workout
            </p>
            {lastWorkout && lastWorkout.sets.length > 0 ? (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums">
                {lastWorkout.sets.map((s) => (
                  <span key={s.id}>
                    {s.weight > 0 && `${s.weight}${settings.unit} × `}
                    {formatSetValue(s.reps, s.metric)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">First time</p>
            )}
            {record && (
              <div className="mt-2 flex items-center gap-2 border-t border-border/60 pt-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Best
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  🏆 {record.weight > 0 && `${record.weight}${settings.unit} × `}
                  {formatSetValue(record.reps, metric)}
                </span>
              </div>
            )}
          </div>

          {/* Logged sets */}
          {currentLogs.length > 0 && (
            <SetList
              logs={currentLogs}
              unit={settings.unit}
              weightIncrement={settings.weightIncrement}
              flashId={flashId}
              prIds={prIds}
              onSave={(id, patch) => repo.updateSet(id, patch)}
              onDelete={(id) => repo.deleteSet(id)}
              onReorder={(ids) => repo.reorderSets(ids)}
            />
          )}

          {/* Set entry — only once started */}
          {isStarted && (
            <div className="flex flex-col gap-3">
              <div className="flex justify-center">
                <WarmupToggle value={warmup} onChange={setWarmup} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Stepper
                  label="Weight"
                  value={weight}
                  onChange={setWeight}
                  step={settings.weightIncrement}
                  unit={settings.unit}
                  decimal
                />
                {metric === 'time' ? (
                  <Stepper
                    label="Time"
                    unit="sec"
                    value={reps}
                    onChange={setReps}
                    step={5}
                    min={0}
                    autoFocus
                  />
                ) : (
                  <Stepper label="Reps" value={reps} onChange={setReps} step={1} min={0} autoFocus />
                )}
              </div>
            </div>
          )}

          <div className="flex-1" />

          {/* Sticky footer actions */}
          <div
            className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-border bg-card/70 px-4 pt-3 backdrop-blur-[20px] backdrop-saturate-[1.8]"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
          >
            {!isStarted ? (
              <>
                <Button size="lg" onClick={startExercise}>
                  Start exercise
                </Button>
                <button
                  type="button"
                  onClick={() => (isLast ? navigate(`/summary/${sessionId}`) : goTo(index + 1))}
                  className="flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <SkipForward className="h-4 w-4" />
                  Skip exercise
                </button>
              </>
            ) : (
              <>
                <Button size="lg" disabled={reps <= 0} onClick={saveSet}>
                  <Check className="h-5 w-5" />
                  Save set
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => (isLast ? navigate(`/summary/${sessionId}`) : goTo(index + 1))}
                >
                  {isLast ? (
                    <>
                      <Flag className="h-4 w-4" />
                      Finish workout
                    </>
                  ) : (
                    <>
                      Next exercise
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

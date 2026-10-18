import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Dumbbell,
  Play,
  Settings as SettingsIcon,
  Trash2,
} from 'lucide-react';
import { useRepo } from '@/storage/RepositoryProvider';
import { useObservable } from '@/hooks/useObservable';
import { useSettings } from '@/hooks/useSettings';
import { deriveTodayTemplate, getRotation } from '@/utils/program';
import { greeting } from '@/utils/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TodayEntries } from '@/components/TodayEntries';
import type { WorkoutSession, WorkoutTemplate } from '@/types';

export default function Dashboard() {
  const navigate = useNavigate();
  const repo = useRepo();
  const { settings } = useSettings();

  const templates =
    useObservable(() => repo.observeTemplates(), [repo]) ?? ([] as WorkoutTemplate[]);
  const completed =
    useObservable(() => repo.observeCompletedSessions(), [repo]) ?? ([] as WorkoutSession[]);
  const active = useObservable(() => repo.observeActiveSession(), [repo]);

  const [confirmDiscard, setConfirmDiscard] = React.useState(false);

  const today = React.useMemo(
    () => deriveTodayTemplate(templates, completed[0] ?? null),
    [templates, completed],
  );
  // The template we last finished — it anchors the rotation (today is the one
  // after it) and stays pinned when the upcoming days are reordered.
  const anchor = React.useMemo(
    () => templates.find((t) => t.id === completed[0]?.templateId) ?? null,
    [templates, completed],
  );
  // The rotation as reorderable days: index 0 is today, then tomorrow, next, …
  const rotation = React.useMemo(
    () => getRotation(templates, today, anchor?.id ?? null),
    [templates, today, anchor],
  );
  // What we render: the rotation (reorderable) plus the anchor appended as a
  // startable loop-back row, so every workout can be started from one place.
  const startable = anchor ? [...rotation, anchor] : rotation;

  // Move a day within the rotation and persist. Prepending the anchor keeps
  // `deriveTodayTemplate` reproducing exactly the new sequence.
  const moveDay = (from: number, to: number) => {
    if (to < 0 || to >= rotation.length || from === to) return;
    const next = [...rotation];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const ids = [...(anchor ? [anchor.id] : []), ...next.map((t) => t.id)];
    repo.reorderTemplates(ids);
  };

  const begin = async (template: WorkoutTemplate) => {
    const id = await repo.startSession(template);
    navigate(`/workout/${id}`);
  };

  const discard = async () => {
    if (!active) return;
    await repo.discardSession(active.id);
    setConfirmDiscard(false);
  };

  return (
    <div className="mx-auto w-full max-w-md md:max-w-3xl xl:max-w-5xl">
      <header
        className="flex items-center justify-between px-5 pb-2 pt-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
      >
        <div>
          <p className="text-[15px] text-muted-foreground">{greeting()}</p>
          <h1 className="text-[28px] font-light leading-tight tracking-[-0.02em]">
            {settings.userName || 'Athlete'}
          </h1>
        </div>
        <button
          type="button"
          aria-label="Settings"
          onClick={() => navigate('/settings')}
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <SettingsIcon className="h-5 w-5" />
        </button>
      </header>

      <TodayEntries />

      <div className="grid items-start gap-6 px-5 py-4 xl:grid-cols-[1.15fr_1fr]">
        {active ? (
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-primary">Workout in progress</p>
              <h2 className="mt-1 text-xl font-bold">{active.templateName}</h2>
              <Button
                size="lg"
                className="mt-4 w-full sm:w-auto sm:px-10"
                onClick={() => navigate(`/workout/${active.id}`)}
              >
                <Play className="h-5 w-5" />
                Resume workout
              </Button>
              {confirmDiscard ? (
                <div className="mt-3 flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => setConfirmDiscard(false)}>
                    Keep
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={discard}>
                    Discard
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDiscard(true)}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 py-2 text-sm font-medium text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Discard workout
                </button>
              )}
            </CardContent>
          </Card>
        ) : today ? (
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-muted-foreground">Today's workout</p>
              <h2 className="mt-1 text-2xl font-bold">{today.name}</h2>
              <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {today.estimatedMinutes} min
                </span>
                <span className="flex items-center gap-1.5">
                  <Dumbbell className="h-4 w-4" />
                  {today.exercises.length} exercises
                </span>
              </div>
              <div className="mt-5 divide-y divide-border">
                {[...today.exercises].sort((a, b) => a.order - b.order).map((exercise, index) => <div className="flex items-center justify-between gap-4 py-3" key={exercise.assignmentId ?? `${exercise.exerciseId}-${index}`}>
                  <span className="text-sm">{exercise.name}</span>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{exercise.targetSets} × {exercise.targetRepRange}</span>
                </div>)}
              </div>
              <Button
                size="lg"
                className="mt-4 w-full sm:w-auto sm:px-10"
                onClick={() => begin(today)}
              >
                <Play className="h-5 w-5" />
                Start workout
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-sm text-muted-foreground">No workout plans yet.</p>
              <Button className="mt-3 w-full" onClick={() => navigate('/templates')}>
                Create a plan
              </Button>
            </CardContent>
          </Card>
        )}

        {startable.length > 0 && (
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Up next</h3>
              <button className="text-sm text-primary" onClick={() => navigate('/templates')}>Edit days</button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {startable.map((t, i) => {
                const reorderable = rotation.length > 1 && i < rotation.length;
                const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : i === 2 ? 'Next' : 'Later';
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-1 rounded-lg border border-border bg-card pl-4 pr-2"
                  >
                    <button
                      type="button"
                      disabled={!!active}
                      onClick={() => begin(t)}
                      aria-label={`Start ${t.name}`}
                      className="flex min-w-0 flex-1 items-center justify-between gap-3 py-3 pr-2 text-left transition-opacity hover:opacity-70 disabled:opacity-50"
                    >
                      <span className="min-w-0">
                        <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {label}
                        </span>
                        <span className="block truncate font-semibold">{t.name}</span>
                      </span>
                      <span className="shrink-0 text-sm text-muted-foreground">
                        {t.exercises.length} · {t.estimatedMinutes}m
                      </span>
                    </button>
                    {reorderable && (
                      <div className="flex shrink-0 items-center gap-1 border-l border-border pl-1">
                        <button
                          type="button"
                          aria-label={`Move ${t.name} earlier`}
                          disabled={i === 0}
                          onClick={() => moveDay(i, i - 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted disabled:opacity-30"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${t.name} later`}
                          disabled={i === rotation.length - 1}
                          onClick={() => moveDay(i, i + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted disabled:opacity-30"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

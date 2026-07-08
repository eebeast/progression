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
import { cn } from '@/lib/utils';
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

  const [pickerOpen, setPickerOpen] = React.useState(false);
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
  const upNext = rotation.slice(1);

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
    <div className="mx-auto w-full max-w-md md:max-w-2xl lg:max-w-3xl xl:max-w-4xl">
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

      <div className="flex flex-col gap-6 px-5 py-4">
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
              <Button className="mt-3 w-full" onClick={() => navigate('/templates/new')}>
                Create a plan
              </Button>
            </CardContent>
          </Card>
        )}

        {templates && templates.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setPickerOpen((o) => !o)}
              className="flex w-full items-center justify-between py-1 text-sm font-medium text-muted-foreground"
            >
              Start a different workout
              <ChevronDown className={cn('h-4 w-4 transition-transform', pickerOpen && 'rotate-180')} />
            </button>
            {pickerOpen && (
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    disabled={!!active}
                    onClick={() => begin(t)}
                    className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left hover:bg-muted/50 disabled:opacity-50"
                  >
                    <span className="font-semibold">{t.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {t.exercises.length} · {t.estimatedMinutes}m
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {upNext.length > 0 && (
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">Up next</h3>
              <span className="text-xs text-muted-foreground">Reorder with the arrows</span>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {upNext.map((t, j) => {
                const i = j + 1; // index within the rotation (0 = today)
                const isLast = i === rotation.length - 1;
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {i === 1 ? 'Tomorrow' : i === 2 ? 'Next' : 'Later'}
                      </p>
                      <p className="truncate font-semibold">{t.name}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="mr-1 text-sm text-muted-foreground">{t.estimatedMinutes}m</span>
                      <button
                        type="button"
                        aria-label={`Move ${t.name} earlier`}
                        onClick={() => moveDay(i, i - 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${t.name} later`}
                        disabled={isLast}
                        onClick={() => moveDay(i, i + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted disabled:opacity-30"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
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

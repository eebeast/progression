import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Dumbbell, MapPin, Plus } from 'lucide-react';
import { useRepo } from '@/storage/RepositoryProvider';
import { useObservable } from '@/hooks/useObservable';
import { useSettings } from '@/hooks/useSettings';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { StreakHeader } from '@/components/StreakHeader';
import { Calendar } from '@/components/Calendar';
import { RunningSummary } from '@/components/RunningSummary';
import { RunForm } from '@/components/RunForm';
import { RunRow } from '@/components/RunRow';
import { EmptyState, FEELING_EMOJI } from '@/components/FeelingPicker';
import {
  computeStreaks,
  dateKey,
  keyToLocalMidnight,
  todayKey,
  weeklyActiveCount,
} from '@/utils/activity';
import { formatDuration, formatLongDate } from '@/utils/format';
import type { Run, WorkoutSession } from '@/types';

export default function Activity() {
  const navigate = useNavigate();
  const repo = useRepo();
  const { settings } = useSettings();

  const sessions =
    useObservable(() => repo.observeCompletedSessions(), [repo]) ?? ([] as WorkoutSession[]);
  const runs = useObservable(() => repo.observeRuns(), [repo]) ?? ([] as Run[]);

  const [selectedKey, setSelectedKey] = React.useState<string>(() => todayKey());
  const [showForm, setShowForm] = React.useState(false);

  const activeKeys = React.useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions) set.add(dateKey(s.date));
    for (const r of runs) set.add(dateKey(r.date));
    return set;
  }, [sessions, runs]);

  const { current, best } = React.useMemo(() => computeStreaks(activeKeys), [activeKeys]);
  const weekCount = React.useMemo(() => weeklyActiveCount(activeKeys), [activeKeys]);

  const dayLifts = sessions.filter((s) => dateKey(s.date) === selectedKey);
  const dayRuns = runs.filter((r) => dateKey(r.date) === selectedKey);
  const recentRuns = runs.slice(0, 8);

  const saveNewRun = async (fields: {
    date: number;
    distanceKm: number;
    durationSeconds: number;
  }) => {
    await repo.createRun(fields);
    setSelectedKey(dateKey(fields.date));
    setShowForm(false);
  };

  return (
    <div>
      <PageHeader title="Activity" />

      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-5">
        {/* 1) Streaks + weekly goal */}
        <StreakHeader
          current={current}
          best={best}
          weekCount={weekCount}
          weeklyGoal={settings.weeklyGoal}
        />

        {/* 2) Calendar + selected-day panel */}
        <div className="flex flex-col gap-3">
          <Calendar
            activeKeys={activeKeys}
            selectedKey={selectedKey}
            onSelectDay={setSelectedKey}
          />

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold">
              {formatLongDate(keyToLocalMidnight(selectedKey))}
            </h3>

            {dayLifts.length === 0 && dayRuns.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nothing logged this day.</p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {dayLifts.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => navigate(`/history/${s.id}`)}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left hover:bg-muted/50"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Dumbbell className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="font-semibold">{s.templateName}</span>
                        <span className="block text-xs text-muted-foreground tabular-nums">
                          {formatDuration((s.endTime ?? s.startTime) - s.startTime)}
                        </span>
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      {s.feeling && <span className="text-lg">{FEELING_EMOJI[s.feeling]}</span>}
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </span>
                  </button>
                ))}
                {dayRuns.map((r) => (
                  <RunRow
                    key={r.id}
                    run={r}
                    onSave={(patch) => repo.updateRun(r.id, patch)}
                    onDelete={() => repo.deleteRun(r.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Running summary — numbers only */}
        {runs.length > 0 && <RunningSummary runs={runs} />}

        {/* 3) Recent runs + Log run */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">Recent runs</h3>
            {!showForm && (
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" />
                Log run
              </Button>
            )}
          </div>

          {showForm && <RunForm onSave={saveNewRun} onCancel={() => setShowForm(false)} />}

          {recentRuns.length === 0 ? (
            !showForm && (
              <EmptyState
                icon={<MapPin className="h-9 w-9" />}
                title="No runs yet"
                description="Log a run to start tracking your activity."
              />
            )
          ) : (
            <div className="flex flex-col gap-2">
              {recentRuns.map((r) => (
                <RunRow
                  key={r.id}
                  run={r}
                  showDate
                  onSave={(patch) => repo.updateRun(r.id, patch)}
                  onDelete={() => repo.deleteRun(r.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

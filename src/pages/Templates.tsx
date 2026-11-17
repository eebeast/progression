import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Download, LayoutGrid, Plus } from 'lucide-react';
import { useRepo } from '@/storage/RepositoryProvider';
import { useObservable } from '@/hooks/useObservable';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/FeelingPicker';
import { PlanTransfer } from '@/components/PlanTransfer';
import { PROGRAM } from '@/storage/defaults';
import { downloadPlans } from '@/utils/planSharing';
import type { WorkoutTemplate } from '@/types';

export default function Templates() {
  const navigate = useNavigate();
  const repo = useRepo();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [exportError, setExportError] = React.useState('');
  const all = useObservable(() => repo.observeTemplates(true), [repo]) ?? ([] as WorkoutTemplate[]);
  const templates = all.filter((day) => !day.archivedAt);
  const previous = all.filter((day) => !!day.archivedAt);
  const matches = templates.length === PROGRAM.length && templates.every((day, index) =>
    day.name === PROGRAM[index].name &&
    JSON.stringify(day.exercises.map((exercise) => [exercise.name, exercise.targetSets, exercise.targetRepRange])) ===
      JSON.stringify(PROGRAM[index].exercises.map((exercise) => [exercise.name, exercise.targetSets, exercise.targetRepRange])));

  const useProgram = async () => {
    if (busy || !window.confirm('Use your four-day Pull, Push, Legs + Abs and Mix plan? A backup will download first. Existing days are kept under Previous days; logged workouts stay unchanged.')) return;
    setBusy(true);
    setError('');
    try {
      await repo.exportData();
      await repo.installFourDayPlan();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Plan could not be loaded.');
    } finally {
      setBusy(false);
    }
  };

  const renderPlan = (template: WorkoutTemplate, index: number, archived = false) => (
    <article className="rounded-xl border border-border bg-card p-4 sm:p-5" key={template.id}>
      <div className="flex items-center gap-2">
        <button className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left" onClick={() => navigate(`/templates/${template.id}`)}>
          <div className="min-w-0">
            {!archived && <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Day {index + 1}</p>}
            <h2 className="mt-1 break-words text-xl font-semibold">{template.name}</h2>
            {archived && <p className="text-sm text-muted-foreground">Previous plan</p>}
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </button>
        <button
          type="button"
          aria-label={`Export ${template.name}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary hover:bg-muted"
          onClick={() => {
            setExportError('');
            try {
              downloadPlans([template]);
            } catch {
              setExportError('Could not export this plan. Please try again.');
            }
          }}
        >
          <Download className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-4 divide-y divide-border">
        {[...template.exercises].sort((a, b) => a.order - b.order).map((exercise, position) => (
          <div className="flex items-center justify-between gap-3 py-2.5 text-sm" key={exercise.assignmentId ?? `${exercise.exerciseId}-${position}`}>
            <span>{exercise.name}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{exercise.targetSets} × {exercise.targetRepRange}</span>
          </div>
        ))}
      </div>
      <button className="mt-4 text-sm font-semibold text-primary" onClick={() => navigate(`/templates/${template.id}`)}>Edit exercises</button>
    </article>
  );

  return (
    <div>
      <PageHeader title="Plans" right={<button type="button" aria-label="New plan" onClick={() => navigate('/templates/new')} className="flex h-11 w-11 items-center justify-center rounded-full text-primary hover:bg-muted"><Plus className="h-6 w-6" /></button>} />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-5 py-5">
        <PlanTransfer templates={templates} />
        {!matches && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
          <div><p className="font-semibold">Your four-day plan</p><p className="mt-1 text-sm text-muted-foreground">Pull · Push · Legs + Abs · Mix</p></div>
          <Button disabled={busy} onClick={useProgram}>Use four-day plan</Button>
        </div>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {exportError && <p role="alert" className="text-sm text-destructive">{exportError}</p>}
        {templates.length === 0 ? (
          <EmptyState
            icon={<LayoutGrid className="h-10 w-10" />}
            title="No plans yet"
            description="Create a workout plan to get started."
            action={<Button onClick={() => navigate('/templates/new')}><Plus className="h-4 w-4" />New plan</Button>}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((template, index) => renderPlan(template, index))}
          </div>
        )}
        <details className="text-sm text-muted-foreground">
          <summary className="cursor-pointer">Plan options</summary>
          <div className="mt-3 flex flex-col items-start gap-3">
            {matches && <Button variant="outline" disabled={busy} onClick={useProgram}>Reset to four-day plan</Button>}
            <Button variant="outline" onClick={() => navigate('/templates/new')}>Add another day</Button>
            {!!previous.length && <div className="w-full"><p className="mb-2 font-medium">Previous days</p><div className="grid gap-4 md:grid-cols-2">{previous.map((day, index) => renderPlan(day, index, true))}</div></div>}
          </div>
        </details>
      </div>
    </div>
  );
}

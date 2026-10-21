import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronUp, ChevronDown, Plus, Trash2, X } from 'lucide-react';
import { useRepo } from '@/storage/RepositoryProvider';
import { useObservable } from '@/hooks/useObservable';
import { newId } from '@/utils/format';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Stepper } from '@/components/Stepper';
import { CategoryPicker } from '@/components/CategoryPicker';
import { configuredCategory } from '@/utils/muscleGroups';
import { matchingExercises, reusableExercise } from '@/utils/exerciseHistory';
import { cn } from '@/lib/utils';
import type { Exercise, ExerciseCategory, Metric, TemplateExercise } from '@/types';

interface EditRow {
  category?: ExerciseCategory;
  key: string;
  exerciseId?: string;
  confirmedDistinct?: boolean;
  restSeconds?: number;
  name: string;
  targetSets: number;
  targetRepRange: string;
  metric: Metric;
}

const blankRow = (): EditRow => ({
  key: newId(),
  name: '',
  targetSets: 3,
  targetRepRange: '8-12',
  metric: 'reps',
});

export default function TemplateEditor() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const isNew = !templateId;

  const repo = useRepo();
  const library = useObservable(() => repo.observeExercises(), [repo]) ?? [];
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [loaded, setLoaded] = React.useState(isNew);
  const [name, setName] = React.useState('');
  const [estimatedMinutes, setEstimatedMinutes] = React.useState(60);
  const [rows, setRows] = React.useState<EditRow[]>([blankRow()]);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  React.useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    repo.getTemplate(templateId!).then((t) => {
      if (cancelled || !t) {
        if (!cancelled) setLoaded(true);
        return;
      }
      setName(t.name);
      setEstimatedMinutes(t.estimatedMinutes);
      setRows(
        [...t.exercises]
          .sort((a, b) => a.order - b.order)
          .map((e) => ({
            key: e.assignmentId ?? newId(),
            exerciseId: e.exerciseId,
            restSeconds: e.restSeconds,
            name: e.name,
            targetSets: e.targetSets,
            targetRepRange: e.targetRepRange,
            metric: e.metric ?? 'reps',
          })),
      );
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [repo, templateId, isNew]);

  const updateRow = (key: string, patch: Partial<EditRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const removeRow = (key: string) => setRows((rs) => rs.filter((r) => r.key !== key));

  const move = (index: number, dir: -1 | 1) => {
    setRows((rs) => {
      const next = [...rs];
      const target = index + dir;
      if (target < 0 || target >= next.length) return rs;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const validRows = rows.filter((r) => r.name.trim().length > 0);
  const canSave = name.trim().length > 0 && validRows.length > 0 && validRows.every((row) => row.exerciseId || row.category);

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true); setError(undefined);
    try {
      const toCreate: Exercise[] = [];
      const exercises: TemplateExercise[] = validRows.map((row, order) => {
        const matches = matchingExercises(library, row.name);
        if (!row.exerciseId && matches.length && !row.confirmedDistinct) throw new Error('Reuse a matching exercise or confirm a distinct movement.');
        const id = row.exerciseId ?? newId();
        if (!row.exerciseId && !row.category) throw new Error('Choose a category for each new exercise.');
        if (!row.exerciseId) toCreate.push({ id, name: row.name.trim(), category: row.category, ...(row.confirmedDistinct ? { separateHistory: true } : {}), createdAt: Date.now() });
        return { assignmentId: row.key, exerciseId: id, name: row.name.trim(), targetSets: row.targetSets,
          restSeconds: row.restSeconds, targetRepRange: row.targetRepRange.trim() || '–', metric: row.metric, order };
      });
      if (toCreate.length) await repo.bulkCreateExercises(toCreate);
      setRows((current) => current.map((row) => ({ ...row, exerciseId: exercises.find((e) => e.assignmentId === row.key)?.exerciseId ?? row.exerciseId })));
      const input = { name: name.trim(), estimatedMinutes, exercises };
      if (isNew) await repo.createTemplate(input);
      else await repo.updateTemplate(templateId!, input);
      navigate('/templates', { replace: true });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Plan could not be saved.'); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    if (templateId) await repo.deleteTemplate(templateId);
    navigate('/templates', { replace: true });
  };

  if (!loaded) return <div className="min-h-[100dvh] bg-background" />;

  return (
    <div>
      <PageHeader
        left={
          <button
            type="button"
            aria-label="Cancel"
            onClick={() => navigate('/templates')}
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        }
        title={isNew ? 'New plan' : 'Edit plan'}
        right={
          <button
            type="button"
            onClick={save}
            disabled={!canSave || saving}
            className="px-1 text-sm font-semibold text-primary disabled:opacity-40"
          >
            Save
          </button>
        }
      />

      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-5">
        {error && <p role="alert" className="text-destructive">{error}</p>}
        <div className="flex flex-col gap-2">
          <Label htmlFor="plan-name">Plan name</Label>
          <Input
            id="plan-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Push"
            autoFocus={isNew}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Estimated minutes</Label>
          <div className="max-w-xs">
            <Stepper
              label=""
              value={estimatedMinutes}
              onChange={setEstimatedMinutes}
              step={5}
              min={5}
              unit="min"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Label>Exercises</Label>
          {rows.map((r, i) => (
            <div key={r.key} className="rounded-xl border border-border bg-card p-3">
              <div className="mb-3 flex items-center gap-2">
                <Input
                  autoComplete="off"
                  value={r.name}
                  aria-label={`Exercise name ${i + 1}`}
                  onChange={(event) => {
                    const value = event.target.value;
                    const existing = reusableExercise(library, value);
                    updateRow(r.key, { name: value, exerciseId: existing?.id, category: configuredCategory(value), confirmedDistinct: false });
                  }}
                  placeholder="Exercise name"
                  className="flex-1"
                />
                <button
                  type="button"
                  aria-label="Remove exercise"
                  onClick={() => removeRow(r.key)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {!r.exerciseId && matchingExercises(library, r.name).length > 0 && <div className="mb-3 flex flex-col gap-2 text-sm">
                <p>Matching names found. Choose an existing exercise or confirm this is a different movement.</p>
                {matchingExercises(library, r.name).map((e) =>
                  <Button key={e.id} variant="outline" onClick={() => updateRow(r.key, { exerciseId: e.id, name: e.name })}>Use existing {e.name}</Button>)}
                <label><input type="checkbox" checked={!!r.confirmedDistinct} onChange={(e) => updateRow(r.key, { confirmedDistinct: e.target.checked })} /> This is a distinct movement</label>
              </div>}
              {!r.exerciseId && <div className="mb-4"><CategoryPicker value={r.category} onChange={(category) => updateRow(r.key, { category })} /></div>}
              <div className="mb-3 flex rounded-lg border border-border p-1">
                {(['reps', 'time'] as Metric[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={r.metric === m}
                    onClick={() => updateRow(r.key, { metric: m })}
                    className={cn(
                      'flex-1 rounded-md py-1.5 text-sm font-semibold capitalize transition-colors',
                      r.metric === m
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {m === 'reps' ? 'Reps' : 'Time'}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Stepper
                  label="Sets"
                  value={r.targetSets}
                  onChange={(v) => updateRow(r.key, { targetSets: v })}
                  step={1}
                  min={1}
                />
                <div className="flex flex-col gap-2">
                  <span className="text-center text-sm font-medium text-muted-foreground">
                    {r.metric === 'time' ? 'Seconds' : 'Rep range'}
                  </span>
                  <Input
                    value={r.targetRepRange}
                    onChange={(e) => updateRow(r.key, { targetRepRange: e.target.value })}
                    placeholder={r.metric === 'time' ? '30-45' : '8-12'}
                    className="h-14 text-center text-lg font-semibold"
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-end gap-1">
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted disabled:opacity-30"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={i === rows.length - 1}
                  onClick={() => move(i, 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted disabled:opacity-30"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={() => setRows((rs) => [...rs, blankRow()])}>
            <Plus className="h-4 w-4" />
            Add exercise
          </Button>
        </div>

        {!isNew &&
          (confirmDelete ? (
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1" onClick={remove}>
                Delete plan
              </Button>
            </div>
          ) : (
            <Button variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" />
              Delete plan
            </Button>
          ))}
      </div>
    </div>
  );
}

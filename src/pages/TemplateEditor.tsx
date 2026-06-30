import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronUp, ChevronDown, Plus, Trash2, X } from 'lucide-react';
import { useRepo } from '@/storage/RepositoryProvider';
import { newId } from '@/utils/format';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Stepper } from '@/components/Stepper';
import type { Exercise, TemplateExercise } from '@/types';

interface EditRow {
  key: string;
  name: string;
  targetSets: number;
  targetRepRange: string;
}

const blankRow = (): EditRow => ({
  key: newId(),
  name: '',
  targetSets: 3,
  targetRepRange: '8-12',
});

export default function TemplateEditor() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const isNew = !templateId;

  const repo = useRepo();
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
            key: newId(),
            name: e.name,
            targetSets: e.targetSets,
            targetRepRange: e.targetRepRange,
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
  const canSave = name.trim().length > 0 && validRows.length > 0;

  const save = async () => {
    if (!canSave) return;

    // Map each row's name into the global exercise library (case-insensitive,
    // create if missing), then write the template through the repository.
    const library = await repo.listExercises();
    const byName = new Map(library.map((e) => [e.name.toLowerCase(), e]));
    const toCreate: Exercise[] = [];

    const exercises: TemplateExercise[] = validRows.map((r, i) => {
      const trimmed = r.name.trim();
      const key = trimmed.toLowerCase();
      let ex = byName.get(key);
      if (!ex) {
        ex = { id: newId(), name: trimmed, createdAt: Date.now() };
        byName.set(key, ex);
        toCreate.push(ex);
      }
      return {
        exerciseId: ex.id,
        name: ex.name,
        targetSets: r.targetSets,
        targetRepRange: r.targetRepRange.trim() || '–',
        order: i,
      };
    });

    if (toCreate.length) await repo.bulkCreateExercises(toCreate);

    const input = { name: name.trim(), estimatedMinutes, exercises };
    if (isNew) {
      await repo.createTemplate(input);
    } else {
      await repo.updateTemplate(templateId!, input);
    }
    navigate('/templates', { replace: true });
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
            disabled={!canSave}
            className="px-1 text-sm font-semibold text-primary disabled:opacity-40"
          >
            Save
          </button>
        }
      />

      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-5">
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
                  value={r.name}
                  onChange={(e) => updateRow(r.key, { name: e.target.value })}
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
                    Rep range
                  </span>
                  <Input
                    value={r.targetRepRange}
                    onChange={(e) => updateRow(r.key, { targetRepRange: e.target.value })}
                    placeholder="8-12"
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

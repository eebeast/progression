import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useRepo } from '@/storage/RepositoryProvider';
import { useObservable } from '@/hooks/useObservable';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Exercise } from '@/types';

export default function Exercises() {
  const navigate = useNavigate(); const repo = useRepo();
  const library = useObservable(() => repo.observeExercises(), [repo]);
  const [archived, setArchived] = React.useState(false);
  const [edit, setEdit] = React.useState<Exercise | null>(null);
  const [name, setName] = React.useState(''); const [muscle, setMuscle] = React.useState('');
  const [equipment, setEquipment] = React.useState(''); const [search, setSearch] = React.useState('');
  const [error, setError] = React.useState<string>(); const [busy, setBusy] = React.useState(false);
  const [mergeTarget, setMergeTarget] = React.useState(''); const [distinct, setDistinct] = React.useState(false);
  const matches = (library ?? []).filter((e) => e.id !== edit?.id && !e.archivedAt && e.name.trim().toLowerCase() === name.trim().toLowerCase());
  const perform = async (action: () => Promise<void>) => {
    setError(undefined); setBusy(true);
    try { await action(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Changes could not be saved'); }
    finally { setBusy(false); }
  };
  const save = async () => {
    if (!name.trim() || (matches.length && !distinct)) return;
    await perform(async () => {
      const input = { name: name.trim(), primaryMuscle: muscle.trim(), equipment: equipment.trim() };
      if (edit) await repo.updateExercise(edit.id, input); else await repo.createExercise(input);
      setEdit(null); setName(''); setMuscle(''); setEquipment(''); setDistinct(false);
    });
  };
  const exercises = [...(library ?? [])].filter((e) => !!e.archivedAt === archived && e.name.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
  return <div>
    <PageHeader title="Exercises" />
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-4">
      <Input aria-label="Search exercises" placeholder="Search exercises" value={search} onChange={(e) => setSearch(e.target.value)} />
      
      {exercises.map((exercise) => <div key={exercise.id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
        <button className="flex flex-1 items-center justify-between text-left font-semibold" onClick={() => navigate(`/exercise/${exercise.id}`)}>{exercise.name}<ChevronRight className="h-5 w-5" /></button>
        
      </div>)}
      {library && !exercises.length && <p className="text-sm text-muted-foreground">No matching exercises.</p>}
      <details className="rounded-xl border border-border bg-card p-4"><summary className="cursor-pointer text-sm font-medium text-muted-foreground">Manage exercise library</summary>
      <section className="mt-4 flex flex-col gap-3" aria-label="Exercise editor">
        <label className="text-sm">Edit an exercise<select className="mt-1 w-full rounded-lg border border-input bg-card p-3 text-foreground" value={edit?.id ?? ''} onChange={(event) => {
          const exercise = library?.find((e) => e.id === event.target.value); setEdit(exercise ?? null); setName(exercise?.name ?? ''); setMuscle(exercise?.primaryMuscle ?? ''); setEquipment(exercise?.equipment ?? ''); setMergeTarget(''); setDistinct(false);
        }}><option value="">Add a new exercise</option>{(library ?? []).filter((exercise) => !exercise.merge).map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}{exercise.archivedAt ? ' (archived)' : ''}</option>)}</select></label>
        <label className="text-sm"><input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} /> Show archived exercises in the list</label>
        <h2 className="font-semibold">{edit ? `Edit ${edit.name}` : 'Add custom exercise'}</h2>
        <label>Name<Input value={name} onChange={(e) => { setName(e.target.value); setDistinct(false); }} /></label>
        <label>Primary muscle (optional)<Input value={muscle} onChange={(e) => setMuscle(e.target.value)} /></label>
        <label>Equipment (optional)<Input value={equipment} onChange={(e) => setEquipment(e.target.value)} /></label>
        {!!matches.length && <div className="flex flex-col gap-2 text-sm"><p>Matching exercise names exist. Reuse one or confirm a distinct movement.</p>
          {matches.map((e) => <Button key={e.id} variant="outline" onClick={() => navigate(`/exercise/${e.id}`)}>View existing {e.name}</Button>)}
          <label><input type="checkbox" checked={distinct} onChange={(e) => setDistinct(e.target.checked)} /> This is a distinct movement</label>
        </div>}
        <Button disabled={busy || !name.trim() || (!!matches.length && !distinct)} onClick={save}>{edit ? 'Save exercise' : 'Create exercise'}</Button>
        {edit && <>
          <Button variant="outline" disabled={busy} onClick={() => perform(async () => { await repo.updateExercise(edit.id, { archivedAt: edit.archivedAt ? undefined : Date.now() }); setEdit(null); })}>{edit.archivedAt ? 'Restore exercise' : 'Archive exercise'}</Button>
          <p className="text-xs text-muted-foreground">Archiving preserves logged sets and existing plan assignments.</p>
          <label>Merge into<select className="ml-2 rounded-lg border border-border bg-background p-2" value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)}>
            <option value="">Choose canonical exercise</option>{(library ?? []).filter((e) => e.id !== edit.id && !e.archivedAt).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select></label>
          <Button variant="outline" disabled={busy || !mergeTarget} onClick={() => perform(async () => {
            const impact = await repo.previewExerciseMerge(edit.id, mergeTarget);
            if (window.confirm(`Merge ${edit.name} into the selected exercise? Updates ${impact.templates} plans, ${impact.sessions} session snapshots and ${impact.sets} sets. Historical names remain unchanged. The original definition is archived with a merge audit.`)) {
              await repo.mergeExercises(edit.id, mergeTarget); setEdit(null); setName('');
            }
          })}>Review and merge</Button>
          <Button variant="ghost" onClick={() => { setEdit(null); setName(''); setDistinct(false); }}>Cancel edit</Button>
        </>}
        {error && <p role="alert" className="text-destructive">{error}</p>}
      </section></details>
    </div>
  </div>;
}

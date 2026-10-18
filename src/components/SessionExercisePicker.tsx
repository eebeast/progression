import * as React from 'react';
import { useRepo } from '@/storage/RepositoryProvider';
import { useObservable } from '@/hooks/useObservable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Stepper } from '@/components/Stepper';
import { cn } from '@/lib/utils';
import type { Metric } from '@/types';

export function SessionExercisePicker({ sessionId, onAdded }: { sessionId: string; onAdded(): void }) {
  const repo = useRepo();
  const library = useObservable(() => repo.observeExercises(), [repo]) ?? [];
  const [selected, setSelected] = React.useState(''); const [name, setName] = React.useState('');
  const [sets, setSets] = React.useState(1); const [range, setRange] = React.useState('');
  const [metric, setMetric] = React.useState<Metric>('reps');
  const [busy, setBusy] = React.useState(false); const [error, setError] = React.useState<string>();
  const [distinct, setDistinct] = React.useState(false);
  const matches = library.filter((e) => !e.archivedAt && e.name.trim().toLowerCase() === name.trim().toLowerCase());
  const duplicate = !selected && matches.length > 1;
  const add = async () => {
    if (busy) return; setBusy(true); setError(undefined);
    try {
      const id = selected || (matches.length === 1 ? matches[0].id : await repo.createExercise({ name: name.trim() }));
      setSelected(id); // Retain identity if adding to the session fails.
      const canonical = library.find((e) => e.id === id);
      await repo.addSessionExercise(sessionId, { exerciseId: id, name: canonical?.name ?? name.trim(), targetSets: sets, targetRepRange: range.trim() || '–', metric, order: 0 });
      setSelected(''); setName(''); setDistinct(false); onAdded();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Exercise could not be added.'); }
    finally { setBusy(false); }
  };
  return <details className="rounded-xl border border-border p-3">
    <summary className="cursor-pointer text-sm font-medium">Add exercise to this workout</summary>
    <div className="mt-3 flex flex-col gap-3">
      <label className="text-sm">Exercise name<Input autoComplete="off" value={name} onChange={(e) => {
        const value = e.target.value;
        const matching = library.filter((exercise) => !exercise.archivedAt && exercise.name.trim().toLowerCase() === value.trim().toLowerCase());
        setName(value); setSelected(matching.length === 1 ? matching[0].id : ''); setDistinct(false);
      }} /></label>
      {duplicate && <div className="flex flex-col gap-2 text-sm">
        <p>Matching names exist. Choose an existing exercise or confirm a distinct movement.</p>
        {matches.map((exercise) => <Button key={exercise.id} variant="outline" onClick={() => setSelected(exercise.id)}>Use existing {exercise.name}</Button>)}
        <label><input type="checkbox" checked={distinct} onChange={(e) => setDistinct(e.target.checked)} /> Distinct movement</label>
      </div>}
      <Stepper label="Working sets" min={1} value={sets} onChange={setSets} />
      <div className="flex rounded-lg border border-border p-1" role="group" aria-label="Metric">
        {(['reps', 'time'] as Metric[]).map((value) => <button key={value} type="button" aria-pressed={metric === value} onClick={() => setMetric(value)} className={cn('flex-1 rounded-md py-1.5 text-sm font-semibold', metric === value ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}>{value === 'reps' ? 'Reps' : 'Time'}</button>)}
      </div>
      <label className="text-sm">Target range (optional)<Input value={range} onChange={(e) => setRange(e.target.value)} /></label>
      <Button disabled={busy || (!selected && !name.trim()) || (duplicate && !distinct) || !Number.isFinite(sets)} onClick={add}>Add to workout</Button>
      {error && <p role="alert" className="text-destructive">{error}</p>}
    </div>
  </details>;
}

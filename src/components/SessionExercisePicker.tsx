import * as React from 'react';
import { useRepo } from '@/storage/RepositoryProvider';
import { useObservable } from '@/hooks/useObservable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Metric } from '@/types';

export function SessionExercisePicker({ sessionId, onAdded }: { sessionId: string; onAdded(): void }) {
  const repo = useRepo();
  const library = useObservable(() => repo.observeExercises(), [repo]) ?? [];
  const [selected, setSelected] = React.useState(''); const [name, setName] = React.useState('');
  const [sets, setSets] = React.useState(1); const [range, setRange] = React.useState('');
  const [metric, setMetric] = React.useState<Metric>('reps');
  const [busy, setBusy] = React.useState(false); const [error, setError] = React.useState<string>();
  const [distinct, setDistinct] = React.useState(false);
  const duplicate = !selected && library.some((e) => !e.archivedAt && e.name.trim().toLowerCase() === name.trim().toLowerCase());
  const add = async () => {
    if (busy) return; setBusy(true); setError(undefined);
    try {
      const id = selected || await repo.createExercise({ name: name.trim() });
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
      <label className="text-sm">Library exercise<select className="mt-1 w-full rounded-lg border border-border bg-background p-2" value={selected} onChange={(e) => setSelected(e.target.value)}>
        <option value="">New custom exercise</option>{library.filter((e) => !e.archivedAt).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select></label>
      {!selected && <label className="text-sm">Exercise name<Input value={name} onChange={(e) => { setName(e.target.value); setDistinct(false); }} /></label>}
      {duplicate && <label className="text-sm">Matching names exist. Choose from the library or confirm: <input type="checkbox" checked={distinct} onChange={(e) => setDistinct(e.target.checked)} /> Distinct movement</label>}
      <label className="text-sm">Working sets<Input type="number" min={1} value={sets} onChange={(e) => setSets(Math.max(1, Math.floor(Number(e.target.value))))} /></label>
      <label className="text-sm">Metric<select value={metric} onChange={(e) => setMetric(e.target.value as Metric)}><option value="reps">Reps</option><option value="time">Seconds</option></select></label>
      <label className="text-sm">Target range (optional)<Input value={range} onChange={(e) => setRange(e.target.value)} /></label>
      <Button disabled={busy || (!selected && !name.trim()) || (duplicate && !distinct) || !Number.isFinite(sets)} onClick={add}>Add to workout</Button>
      {error && <p role="alert" className="text-destructive">{error}</p>}
    </div>
  </details>;
}

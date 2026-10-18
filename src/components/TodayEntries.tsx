import * as React from 'react';
import { Footprints, Scale } from 'lucide-react';
import { useRepo } from '@/storage/RepositoryProvider';
import { useObservable } from '@/hooks/useObservable';
import { useSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { RunForm } from '@/components/RunForm';
import { BodyWeightForm } from '@/components/BodyWeightSection';
import type { BodyWeightEntry } from '@/types';

/** Today is the entry point; Activity recalls and charts the saved records. */
export function TodayEntries() {
  const repo = useRepo(); const { settings } = useSettings();
  const weights = useObservable(() => repo.observeBodyWeights(), [repo]);
  const [entry, setEntry] = React.useState<'run' | 'weight' | null>(null);
  const [saved, setSaved] = React.useState<string>();
  const latest = weights?.reduce<BodyWeightEntry | undefined>((value, next) => !value || next.date > value.date || next.date === value.date && next.createdAt > value.createdAt ? next : value, undefined);
  return <section aria-label="Log activity" className="mx-5 mb-2 mt-3">
    {!entry ? <div className="grid grid-cols-2 gap-3">
      <Button variant="outline" onClick={() => { setEntry('run'); setSaved(undefined); }}><Footprints className="h-4 w-4" />Add run</Button>
      <Button variant="outline" onClick={() => { setEntry('weight'); setSaved(undefined); }}><Scale className="h-4 w-4" />Add weight</Button>
    </div> : <div className="max-w-xl">
      <h2 className="mb-3 font-semibold">{entry === 'run' ? 'Add run' : 'Add body weight'}</h2>
      {entry === 'run' ? <RunForm onCancel={() => setEntry(null)} onSave={async (input) => {
        await repo.createRun(input); setEntry(null); setSaved('Run saved on this device.');
      }} /> : <BodyWeightForm unit={settings.unit} defaultWeight={latest?.weight ?? 0} onCancel={() => setEntry(null)} onSave={async (input) => {
        await repo.addBodyWeight(input); setEntry(null); setSaved('Body weight saved on this device.');
      }} />}
    </div>}
    {saved && <p role="status" className="mt-3 text-sm text-muted-foreground">{saved}</p>}
  </section>;
}

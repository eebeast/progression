import * as React from 'react';
import { Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRepo } from '@/storage/RepositoryProvider';
import type { SharedPlanInput } from '@/storage/repository';
import type { WorkoutTemplate } from '@/types';
import { downloadPlans, MAX_PLAN_FILE_BYTES, parsePlanFile } from '@/utils/planSharing';

export function PlanTransfer({ templates }: { templates: WorkoutTemplate[] }) {
  const repo = useRepo();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<SharedPlanInput[] | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState('');

  const readFile = async (file: File) => {
    setBusy(true);
    setError('');
    setMessage('');
    setPreview(null);
    try {
      if (file.size > MAX_PLAN_FILE_BYTES) throw new Error('Choose a plans file smaller than 1 MB.');
      setPreview(parsePlanFile(await file.text()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read plans.');
    } finally {
      setBusy(false);
    }
  };

  const addPlans = async () => {
    if (!preview || busy) return;
    setBusy(true);
    setError('');
    try {
      await repo.importPlans(preview);
      setMessage(`Added ${preview.length} ${preview.length === 1 ? 'plan' : 'plans'}.`);
      setPreview(null);
    } catch {
      setError('Could not add plans. Your existing data is unchanged. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Share and import plans" className="mx-4 my-4 flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" /> Import plans
        </Button>
        <Button variant="outline" disabled={busy || templates.length === 0} onClick={() => {
          setError('');
          try {
            downloadPlans(templates);
          } catch {
            setError('Could not export plans. Please try again.');
          }
        }}>
          <Download className="h-4 w-4" /> Export all plans
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Send a plan file to someone, then use Import plans on their device. Imports add copies; existing plans and history stay saved.</p>
      <input ref={fileRef} aria-label="Choose plans file" type="file" accept="application/json,.json" className="hidden" disabled={busy} onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) void readFile(file);
      }} />
      {preview && (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <h2 className="font-semibold">Plans to add</h2>
          {preview.map((plan, index) => (
            <div key={index}>
              <p className="font-medium">{plan.name}</p>
              {plan.estimatedMinutes === undefined && (
                <p className="text-xs text-muted-foreground">Duration not provided. Uses the default 60 minutes; you can edit it after import.</p>
              )}
              <ul className="list-inside list-disc text-sm text-muted-foreground">
                {plan.exercises.map((exercise, exerciseIndex) => (
                  <li key={exerciseIndex}>{exercise.name} — {exercise.targetSets} × {exercise.targetRepRange}{exercise.metric === 'time' ? ' seconds' : ''}</li>
                ))}
              </ul>
              {templates.some((template) => template.name.toLowerCase() === plan.name.toLowerCase()) && (
                <p className="text-xs text-muted-foreground">A plan with this name exists. A separate copy will be added.</p>
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <Button disabled={busy} onClick={addPlans}>{busy ? 'Adding…' : `Add ${preview.length} ${preview.length === 1 ? 'plan' : 'plans'}`}</Button>
            <Button variant="secondary" disabled={busy} onClick={() => { setPreview(null); setError(''); }}>Cancel</Button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {message && <p role="status" className="text-sm text-primary">{message}</p>}
    </section>
  );
}

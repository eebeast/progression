import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  RunFields,
  emptyDraft,
  isDraftValid,
  parseDraft,
  type RunDraft,
} from '@/components/RunFields';

interface RunFormProps {
  onSave: (fields: { date: number; distanceKm: number; durationSeconds: number }) => void | Promise<unknown>;
  onCancel: () => void;
}

export function RunForm({ onSave, onCancel }: RunFormProps) {
  const [draft, setDraft] = React.useState<RunDraft>(emptyDraft);
  const valid = isDraftValid(draft);
  const savingRef = React.useRef(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const save = async () => {
    if (!valid || savingRef.current) return;
    savingRef.current = true; setSaving(true); setError(undefined);
    try { await onSave(parseDraft(draft)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Run could not be saved.'); }
    finally { savingRef.current = false; setSaving(false); }
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-4">
        <RunFields draft={draft} onChange={setDraft} idPrefix="new-run" />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" disabled={saving} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={!valid || saving}
            onClick={save}
          >
            {saving ? 'Saving…' : 'Save run'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

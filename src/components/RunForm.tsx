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
  onSave: (fields: { date: number; distanceKm: number; durationSeconds: number }) => void;
  onCancel: () => void;
}

export function RunForm({ onSave, onCancel }: RunFormProps) {
  const [draft, setDraft] = React.useState<RunDraft>(emptyDraft);
  const valid = isDraftValid(draft);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-4">
        <RunFields draft={draft} onChange={setDraft} idPrefix="new-run" />
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={!valid}
            onClick={() => onSave(parseDraft(draft))}
          >
            Save run
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

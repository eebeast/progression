import * as React from 'react';
import { Check, MapPin, Trash2, X } from 'lucide-react';
import type { Run } from '@/types';
import { Button } from '@/components/ui/button';
import {
  RunFields,
  draftFromRun,
  isDraftValid,
  parseDraft,
  type RunDraft,
} from '@/components/RunFields';
import { formatDistanceKm, formatRunTime, formatDate } from '@/utils/format';
import { formatPace, formatSpeed } from '@/utils/runMetrics';

interface RunRowProps {
  run: Run;
  showDate?: boolean;
  onSave: (patch: { date: number; distanceKm: number; durationSeconds: number }) => void;
  onDelete: () => void;
}

/** A logged run. Tap to edit inline or delete (same pattern as a set). */
export function RunRow({ run, showDate = false, onSave, onDelete }: RunRowProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<RunDraft>(() => draftFromRun(run));

  React.useEffect(() => {
    if (!editing) setDraft(draftFromRun(run));
  }, [run, editing]);

  if (editing) {
    return (
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">Edit run</span>
          <button
            type="button"
            aria-label="Cancel edit"
            onClick={() => setEditing(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <RunFields draft={draft} onChange={setDraft} idPrefix={`edit-${run.id}`} />
        <div className="mt-3 flex gap-2">
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => {
              onDelete();
              setEditing(false);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <Button
            className="flex-1"
            disabled={!isDraftValid(draft)}
            onClick={() => {
              onSave(parseDraft(draft));
              setEditing(false);
            }}
          >
            <Check className="h-4 w-4" />
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MapPin className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold tabular-nums">
          {formatDistanceKm(run.distanceKm)} <span className="text-muted-foreground">·</span>{' '}
          {formatRunTime(run.durationSeconds)}
        </p>
        <p className="text-sm text-muted-foreground tabular-nums">
          {formatPace(run)} · {formatSpeed(run)}
        </p>
        {showDate && <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(run.date)}</p>}
      </div>
    </button>
  );
}

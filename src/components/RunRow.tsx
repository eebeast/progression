import * as React from 'react';
import { Check, MapPin, Trash2, X } from 'lucide-react';
import type { Run } from '@/types';
import { Button } from '@/components/ui/button';
import { LogCard } from '@/components/LogCard';
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

  const stats = `${formatPace(run)} · ${formatSpeed(run)}`;
  return (
    <LogCard
      icon={<MapPin className="h-4 w-4" />}
      title={`${formatDistanceKm(run.distanceKm)} · ${formatRunTime(run.durationSeconds)}`}
      subtitle={showDate ? `${formatDate(run.date)} · ${stats}` : stats}
      feeling={run.feeling}
      onClick={() => setEditing(true)}
    />
  );
}

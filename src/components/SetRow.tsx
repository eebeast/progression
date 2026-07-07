import * as React from 'react';
import { Check, Trash2, X } from 'lucide-react';
import type { ExerciseLog, Unit } from '@/types';
import { Stepper } from '@/components/Stepper';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SetRowProps {
  log: ExerciseLog;
  unit: Unit;
  weightIncrement: number;
  /** Show a "New PR" badge — this set beat the prior record when logged. */
  isPR?: boolean;
  flash?: boolean;
  onSave: (patch: { weight: number; reps: number }) => void;
  onDelete: () => void;
}

/** A logged set. Tap to edit weight/reps inline or delete. */
export function SetRow({ log, unit, weightIncrement, isPR, flash, onSave, onDelete }: SetRowProps) {
  const [editing, setEditing] = React.useState(false);
  const [weight, setWeight] = React.useState(log.weight);
  const [reps, setReps] = React.useState(log.reps);

  React.useEffect(() => {
    if (!editing) {
      setWeight(log.weight);
      setReps(log.reps);
    }
  }, [log.weight, log.reps, editing]);

  if (editing) {
    return (
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">Set {log.setNumber}</span>
          <button
            type="button"
            aria-label="Cancel edit"
            onClick={() => setEditing(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Stepper
            label="Weight"
            value={weight}
            onChange={setWeight}
            step={weightIncrement}
            unit={unit}
            decimal
          />
          <Stepper label="Reps" value={reps} onChange={setReps} step={1} min={0} />
        </div>
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
            disabled={reps <= 0}
            onClick={() => {
              onSave({ weight, reps });
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
      className={cn(
        'flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left',
        'transition-colors hover:bg-muted/50',
        flash && 'animate-set-flash',
      )}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm font-semibold tabular-nums text-muted-foreground">
        {log.setNumber}
      </span>
      <span className="flex items-center gap-2">
        {isPR && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            🏆 New PR
          </span>
        )}
        <span className="text-lg font-semibold tabular-nums">
          {log.weight}
          {unit} <span className="text-muted-foreground">×</span> {log.reps}
        </span>
      </span>
    </button>
  );
}

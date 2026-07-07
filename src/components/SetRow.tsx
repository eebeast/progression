import * as React from 'react';
import { Check, Trash2, X } from 'lucide-react';
import type { ExerciseLog, Unit } from '@/types';
import { Stepper } from '@/components/Stepper';
import { Button } from '@/components/ui/button';
import { WarmupToggle } from '@/components/WarmupToggle';
import { cn } from '@/lib/utils';

interface SetRowProps {
  log: ExerciseLog;
  unit: Unit;
  weightIncrement: number;
  /** Working-set number (1-based), ignored for warm-up sets which show a "W". */
  displayNumber: number;
  flash?: boolean;
  onSave: (patch: { weight: number; reps: number; isWarmup: boolean }) => void;
  onDelete: () => void;
}

/** A logged set. Tap to edit weight/reps/warm-up inline or delete. */
export function SetRow({
  log,
  unit,
  weightIncrement,
  displayNumber,
  flash,
  onSave,
  onDelete,
}: SetRowProps) {
  const [editing, setEditing] = React.useState(false);
  const [weight, setWeight] = React.useState(log.weight);
  const [reps, setReps] = React.useState(log.reps);
  const [warmup, setWarmup] = React.useState(!!log.isWarmup);

  React.useEffect(() => {
    if (!editing) {
      setWeight(log.weight);
      setReps(log.reps);
      setWarmup(!!log.isWarmup);
    }
  }, [log.weight, log.reps, log.isWarmup, editing]);

  if (editing) {
    return (
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">
            {log.isWarmup ? 'Warm-up set' : `Set ${displayNumber}`}
          </span>
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
        <div className="mt-3">
          <WarmupToggle value={warmup} onChange={setWarmup} />
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
              onSave({ weight, reps, isWarmup: warmup });
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
        'flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors',
        log.isWarmup
          ? 'border-dashed border-border bg-muted/30 hover:bg-muted/50'
          : 'border-border bg-card hover:bg-muted/50',
        flash && 'animate-set-flash',
      )}
    >
      <span
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums',
          log.isWarmup
            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
            : 'bg-muted text-muted-foreground',
        )}
      >
        {log.isWarmup ? 'W' : displayNumber}
      </span>
      <span
        className={cn(
          'text-lg font-semibold tabular-nums',
          log.isWarmup && 'text-muted-foreground',
        )}
      >
        {log.weight}
        {unit} <span className="text-muted-foreground">×</span> {log.reps}
      </span>
    </button>
  );
}

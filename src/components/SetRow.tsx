import * as React from 'react';
import { Check, GripVertical, Trash2, X } from 'lucide-react';
import type { ExerciseLog, Unit } from '@/types';
import { Stepper } from '@/components/Stepper';
import { Button } from '@/components/ui/button';
import { WarmupToggle } from '@/components/WarmupToggle';
import { cn } from '@/lib/utils';
import { formatSetValue } from '@/utils/format';

interface SetRowProps {
  log: ExerciseLog;
  unit: Unit;
  weightIncrement: number;
  /** Working-set number (1-based), ignored for warm-up sets which show a "W". */
  displayNumber: number;
  /** Show a "New PR" badge — this set beat the prior record when logged. */
  isPR?: boolean;
  flash?: boolean;
  dragging?: boolean;
  /** Pointer handlers for the drag handle; when omitted, the row isn't draggable. */
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  style?: React.CSSProperties;
  onSave: (patch: { weight: number; reps: number; isWarmup: boolean }) => void;
  onDelete: () => void;
}

/** A logged set. Tap to edit weight/reps/warm-up inline; drag the handle to reorder. */
export const SetRow = React.forwardRef<HTMLDivElement, SetRowProps>(function SetRow(
  {
    log,
    unit,
    weightIncrement,
    displayNumber,
    isPR,
    flash,
    dragging,
    dragHandleProps,
    style,
    onSave,
    onDelete,
  },
  ref,
) {
  const isTime = log.metric === 'time';
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
      <div ref={ref} style={style} className="rounded-lg border border-border bg-card p-3">
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
          {isTime ? (
            <Stepper label="Time" unit="sec" value={reps} onChange={setReps} step={5} min={0} />
          ) : (
            <Stepper label="Reps" value={reps} onChange={setReps} step={1} min={0} />
          )}
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

  const showHandle = !!dragHandleProps;

  return (
    <div
      ref={ref}
      style={style}
      className={cn(
        'flex items-stretch rounded-lg border transition-shadow',
        log.isWarmup ? 'border-dashed border-border bg-muted/30' : 'border-border bg-card',
        dragging && 'relative z-10 shadow-lg',
        flash && 'animate-set-flash',
      )}
    >
      {showHandle && (
        <button
          type="button"
          aria-label={`Drag to reorder set ${log.setNumber}`}
          {...dragHandleProps}
          className="flex shrink-0 touch-none cursor-grab items-center rounded-l-lg pl-2 pr-1 text-muted-foreground/50 transition-colors hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-5 w-5" />
        </button>
      )}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={cn(
          'flex flex-1 items-center justify-between gap-3 py-3 pr-4 text-left transition-colors hover:bg-muted/50',
          showHandle ? 'rounded-r-lg pl-1' : 'rounded-lg pl-4',
        )}
      >
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums',
            log.isWarmup
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {log.isWarmup ? 'W' : displayNumber}
        </span>
        <span className="flex items-center gap-2">
          {isPR && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              🏆 New PR
            </span>
          )}
          <span
            className={cn(
              'text-lg font-semibold tabular-nums',
              log.isWarmup && 'text-muted-foreground',
            )}
          >
            {log.weight > 0 && (
              <>
                {log.weight}
                {unit} <span className="text-muted-foreground">×</span>{' '}
              </>
            )}
            {formatSetValue(log.reps, log.metric)}
          </span>
        </span>
      </button>
    </div>
  );
});

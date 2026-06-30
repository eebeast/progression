import * as React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  decimal?: boolean;
  autoFocus?: boolean;
}

/** Big -/+ numeric stepper with direct keyboard entry. */
export function Stepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = Infinity,
  unit,
  decimal = false,
  autoFocus = false,
}: StepperProps) {
  // Guard against a non-finite value (e.g. a legacy NaN) ever rendering.
  const safeValue = Number.isFinite(value) ? value : min;

  // Local text state so the field can be cleared/typed without fighting the number.
  const [text, setText] = React.useState(String(safeValue));

  React.useEffect(() => {
    setText(String(safeValue));
  }, [safeValue]);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  const round = (n: number) => {
    // Avoid floating point dust like 2.5000000004.
    return Math.round(n * 1000) / 1000;
  };

  const bump = (dir: 1 | -1) => {
    const next = clamp(round(safeValue + dir * step));
    onChange(next);
  };

  const commit = (raw: string) => {
    const parsed = decimal ? parseFloat(raw) : parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      onChange(min);
      setText(String(min));
      return;
    }
    const next = clamp(round(parsed));
    onChange(next);
    setText(String(next));
  };

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="text-center text-sm font-medium text-muted-foreground">{label}</span>
      )}
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => bump(-1)}
          className={cn(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-card',
            'text-foreground transition-colors hover:bg-muted active:bg-muted/70',
          )}
        >
          <Minus className="h-5 w-5" />
        </button>

        <div className="relative flex-1">
          <input
            inputMode={decimal ? 'decimal' : 'numeric'}
            pattern={decimal ? '[0-9]*[.,]?[0-9]*' : '[0-9]*'}
            value={text}
            autoFocus={autoFocus}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setText(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            className={cn(
              'h-14 w-full rounded-lg border border-input bg-card text-center text-2xl font-bold tabular-nums',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              unit && 'pr-12',
            )}
          />
          {unit && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
              {unit}
            </span>
          )}
        </div>

        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => bump(1)}
          className={cn(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-card',
            'text-foreground transition-colors hover:bg-muted active:bg-muted/70',
          )}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

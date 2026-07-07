import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WarmupToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

/** Small pill that tags a set as a warm-up (off by default). */
export function WarmupToggle({ value, onChange }: WarmupToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={value}
      onClick={() => onChange(!value)}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
        value
          ? 'border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400'
          : 'border-border bg-card text-muted-foreground hover:bg-muted',
      )}
    >
      <Flame className="h-4 w-4" />
      Warm-up
    </button>
  );
}

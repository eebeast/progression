import { Smile, Meh, Frown } from 'lucide-react';
import type { Feeling } from '@/types';
import { cn } from '@/lib/utils';

const options: { value: Feeling; label: string; icon: typeof Smile }[] = [
  { value: 'good', label: 'Good', icon: Smile },
  { value: 'ok', label: 'OK', icon: Meh },
  { value: 'rough', label: 'Rough', icon: Frown },
];

interface FeelingPickerProps {
  value: Feeling | null;
  onChange: (value: Feeling) => void;
}

export function FeelingPicker({ value, onChange }: FeelingPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {options.map(({ value: v, label, icon: Icon }) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            aria-pressed={active}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl border-2 py-4 transition-colors',
              active
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:bg-muted',
            )}
          >
            <Icon className="h-8 w-8" />
            <span className="text-sm font-medium">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export const FEELING_EMOJI: Record<Feeling, string> = {
  good: '🙂',
  ok: '😐',
  rough: '😣',
};

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && (
        <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

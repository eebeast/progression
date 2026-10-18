import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dateKey, keyToOrdinal, todayKey } from '@/utils/activity';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface CalendarProps {
  activeKeys: Set<string>;
  selectedKey: string | null;
  onSelectDay: (key: string) => void;
  embedded?: boolean;
}

export function Calendar({ activeKeys, selectedKey, onSelectDay, embedded = false }: CalendarProps) {
  const now = new Date();
  const [view, setView] = React.useState({ year: now.getFullYear(), month: now.getMonth() });

  const today = todayKey();
  const todayOrd = keyToOrdinal(today);

  const firstOfMonth = new Date(view.year, view.month, 1);
  // Monday-based leading blank count (getDay: 0=Sun..6=Sat).
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

  const monthLabel = firstOfMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const step = (delta: number) =>
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className={cn('min-w-0', embedded ? 'mx-auto w-full max-w-[336px]' : 'rounded-xl border border-border bg-card p-3 sm:p-4')}>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => step(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-semibold">{monthLabel}</span>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => step(1)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="py-1 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`b${i}`} aria-hidden />;
          const key = dateKey(new Date(view.year, view.month, day).getTime());
          const ord = keyToOrdinal(key);
          const active = activeKeys.has(key);
          const isToday = key === today;
          const isFuture = ord > todayOrd;
          const isSelected = key === selectedKey;

          return (
            <button
              key={key}
              type="button"
              disabled={isFuture}
              onClick={() => onSelectDay(key)}
              aria-label={key}
              aria-pressed={isSelected}
              className={cn(
                'relative flex aspect-square w-full items-center justify-center rounded-lg text-sm tabular-nums transition-colors',
                !embedded && 'min-h-[40px]',
                isFuture && 'cursor-default text-muted-foreground/40',
                !isFuture && !active && !isSelected && 'text-foreground hover:bg-muted',
                active && !isSelected && 'bg-primary/15 font-semibold text-primary hover:bg-primary/25',
                isSelected && 'bg-primary font-semibold text-primary-foreground',
                isToday && !isSelected && 'ring-2 ring-inset ring-ring',
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { FEELING_EMOJI } from '@/components/FeelingPicker';
import type { Feeling } from '@/types';

interface LogCardProps {
  /** Small glyph shown in the leading accent circle. */
  icon: React.ReactNode;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  feeling?: Feeling | null;
  onClick: () => void;
}

/**
 * The shared History/Activity log row: a lift or a run rendered with the same
 * shape — leading accent icon, title + muted subtitle, optional feeling emoji,
 * and a chevron. Keeps every kind of log visually consistent.
 */
export function LogCard({ icon, title, subtitle, feeling, onClick }: LogCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold tabular-nums">{title}</span>
          <span className="block truncate text-sm text-muted-foreground tabular-nums">
            {subtitle}
          </span>
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {feeling && <span className="text-xl">{FEELING_EMOJI[feeling]}</span>}
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </span>
    </button>
  );
}

import { Flame, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

function ProgressRing({ value, max }: { value: number; max: number }) {
  const size = 56;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-sm font-bold tabular-nums">
        {value}/{max}
      </span>
    </div>
  );
}

interface StreakHeaderProps {
  current: number;
  best: number;
  weekCount: number;
  weeklyGoal: number;
}

export function StreakHeader({ current, best, weekCount, weeklyGoal }: StreakHeaderProps) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 pt-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Flame className="h-7 w-7 shrink-0 text-primary" />
            <span className="text-3xl font-bold tabular-nums">{current}</span>
            <span className="text-sm text-muted-foreground">
              day{current === 1 ? '' : 's'}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Trophy className="h-4 w-4" />
            Best streak <span className="font-semibold text-foreground tabular-nums">{best}</span>
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-1">
          <ProgressRing value={weekCount} max={weeklyGoal} />
          <span className="text-xs text-muted-foreground">this week</span>
        </div>
      </CardContent>
    </Card>
  );
}

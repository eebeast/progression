import * as React from 'react';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import { formatDate } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { SessionPoint } from '@/utils/personalRecords';

type Metric = 'weight' | 'count';

/** Compact axis label, e.g. "Jul 8". */
function shortDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * A single, minimal progress chart for one exercise: one dot per session in
 * chronological order. Facts only — no trend line, projection, or annotation.
 */
export function ExerciseProgressChart({
  points,
  unit,
}: {
  points: SessionPoint[];
  unit: string;
}) {
  const [metric, setMetric] = React.useState<Metric>('weight');

  if (points.length < 2) {
    return <p className="text-sm text-muted-foreground">Not enough data yet</p>;
  }

  const data = points.map((p) => ({
    date: p.date,
    weight: p.topWeight,
    count: p.workingSets,
    reps: p.topReps,
  }));

  const renderTooltip = ({ active, payload }: TooltipContentProps) => {
    if (!active || !payload || payload.length === 0) return null;
    const p = payload[0].payload as (typeof data)[number];
    return (
      <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
        {metric === 'weight'
          ? `${formatDate(p.date)}: ${p.weight}${unit} × ${p.reps}`
          : `${formatDate(p.date)}: ${p.count} working set${p.count === 1 ? '' : 's'}`}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-2 flex gap-2">
        {(
          [
            ['weight', 'Top set weight'],
            ['count', 'Total working sets'],
          ] as [Metric, string][]
        ).map(([key, label]) => {
          const active = metric === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setMetric(key)}
              aria-pressed={active}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              stroke="var(--border)"
              tickLine={false}
              minTickGap={16}
            />
            <YAxis
              width={36}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              stroke="var(--border)"
              tickLine={false}
              allowDecimals={false}
              unit={metric === 'weight' ? unit : undefined}
            />
            <Tooltip content={renderTooltip} cursor={{ stroke: 'var(--border)' }} />
            <Line
              type="monotone"
              dataKey={metric}
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ r: 3, fill: 'var(--primary)', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

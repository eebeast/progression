import { Card, CardContent } from '@/components/ui/card';
import { formatDistanceKm } from '@/utils/format';
import { formatPace } from '@/utils/runMetrics';
import { isInCurrentMonth, isInCurrentWeek } from '@/utils/activity';
import type { Run } from '@/types';

function summarize(runs: Run[]) {
  let totalKm = 0;
  let totalSeconds = 0;
  let longestKm = 0;
  for (const r of runs) {
    totalKm += r.distanceKm;
    totalSeconds += r.durationSeconds;
    if (r.distanceKm > longestKm) longestKm = r.distanceKm;
  }
  return { totalKm, totalSeconds, count: runs.length, longestKm };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Period({ title, runs }: { title: string; runs: Run[] }) {
  const s = summarize(runs);
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">{title}</p>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Distance" value={formatDistanceKm(s.totalKm)} />
        <Stat label="Runs" value={String(s.count)} />
        {/* Average pace is recomputed from period totals, not averaged per-run. */}
        <Stat
          label="Avg pace"
          value={formatPace({ distanceKm: s.totalKm, durationSeconds: s.totalSeconds })}
        />
        <Stat label="Longest" value={s.count ? formatDistanceKm(s.longestKm) : '—'} />
      </div>
    </div>
  );
}

export function RunningSummary({ runs }: { runs: Run[] }) {
  const weekRuns = runs.filter((r) => isInCurrentWeek(r.date));
  const monthRuns = runs.filter((r) => isInCurrentMonth(r.date));

  return (
    <Card>
      <CardContent className="pt-4">
        <p className="mb-3 text-sm font-semibold text-muted-foreground">Running</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Period title="This week" runs={weekRuns} />
          <div className="border-t border-border pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
            <Period title="This month" runs={monthRuns} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

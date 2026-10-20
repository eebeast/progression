import { Flame, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { activityStreaks, StreakPeriod } from '@/utils/activityStreaks';

export function ActivityStreakCard({ streak, period, onPeriodChange }: {
  streak: ReturnType<typeof activityStreaks>; period: StreakPeriod; onPeriodChange(period: StreakPeriod): void;
}) {
  const unit = period === 'week' ? 'week' : 'day';
  return <section aria-label="Activity streaks" className="rounded-xl border border-primary/20 bg-card p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3"><div className="shrink-0 rounded-xl bg-primary/10 p-2.5 text-primary"><Flame className="h-5 w-5" aria-hidden="true" /></div><div className="min-w-0"><h2 className="font-semibold">Keep showing up</h2><p className="mt-0.5 text-xs text-muted-foreground">Your activity streak · All recorded history</p></div></div>
      <div className="grid grid-cols-2 rounded-lg bg-muted p-1" role="group" aria-label="Streak period">{(['week', 'day'] as const).map((value) => <button type="button" key={value} aria-pressed={period === value} onClick={() => onPeriodChange(value)} className={cn('min-h-11 min-w-[4.5rem] rounded-md px-2 py-1.5 text-xs font-semibold sm:px-3 sm:text-sm', period === value ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{value === 'week' ? 'Weeks' : 'Days'}</button>)}</div>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="min-w-0 rounded-xl bg-muted/40 p-3 sm:p-4"><p className="text-xs text-muted-foreground">Current streak</p><p className="mt-1 text-3xl font-bold tabular-nums text-primary">{streak.current}<span className="ml-1 text-xs font-medium text-muted-foreground sm:ml-1.5 sm:text-sm">{unit}{streak.current !== 1 && 's'}</span></p>
          {streak.current > 0 && streak.current === streak.best && <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"><Trophy className="h-3 w-3" aria-hidden="true" />Personal best</span>}
        </div>
        <div className="min-w-0 rounded-xl bg-muted/40 p-3 sm:p-4"><p className="text-xs text-muted-foreground">Best streak</p><p className="mt-1 text-3xl font-bold tabular-nums">{streak.best}<span className="ml-1 text-xs font-medium text-muted-foreground sm:ml-1.5 sm:text-sm">{unit}{streak.best !== 1 && 's'}</span></p></div>
    </div>
    <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">This week · {streak.activeDaysThisWeek} active {streak.activeDaysThisWeek === 1 ? 'day' : 'days'}. A completed workout or logged run counts. {period === 'week' ? 'Consecutive weeks with activity; the current week stays open.' : 'Consecutive active days; yesterday’s streak stays open until today ends.'} Independent of dashboard filters.</p>
  </section>;
}

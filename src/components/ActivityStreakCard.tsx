import { Check, Flame, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { activityStreaks, StreakPeriod } from '@/utils/activityStreaks';

export function ActivityStreakCard({ streak, period, onPeriodChange }: {
  streak: ReturnType<typeof activityStreaks>; period: StreakPeriod; onPeriodChange(period: StreakPeriod): void;
}) {
  const unit = period === 'week' ? 'week' : 'day';
  return <section aria-label="Activity streaks" className="rounded-xl border border-primary/20 bg-card p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Flame className="h-5 w-5" aria-hidden="true" /></div><div><h2 className="font-semibold">Keep showing up</h2><p className="mt-0.5 text-xs text-muted-foreground">Your activity streak · All recorded history</p></div></div>
      <div className="flex rounded-lg bg-muted p-1" role="group" aria-label="Streak period">{(['week', 'day'] as const).map((value) => <button type="button" key={value} aria-pressed={period === value} onClick={() => onPeriodChange(value)} className={cn('rounded-md px-3 py-1.5 text-sm font-semibold', period === value ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{value === 'week' ? 'Weeks' : 'Days'}</button>)}</div>
    </div>
    <div className="mt-5 grid gap-6 md:grid-cols-2">
      <div className="grid grid-cols-2 gap-4">
        <div><p className="text-xs text-muted-foreground">Current streak</p><p className="mt-1 text-3xl font-bold tabular-nums text-primary">{streak.current}<span className="ml-1.5 text-sm font-medium text-muted-foreground">{unit}{streak.current !== 1 && 's'}</span></p>
          {streak.current > 0 && streak.current === streak.best && <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"><Trophy className="h-3 w-3" aria-hidden="true" />Personal best</span>}
        </div>
        <div><p className="text-xs text-muted-foreground">Best streak</p><p className="mt-1 text-3xl font-bold tabular-nums">{streak.best}<span className="ml-1.5 text-sm font-medium text-muted-foreground">{unit}{streak.best !== 1 && 's'}</span></p></div>
      </div>
      <div><p className="mb-3 text-xs text-muted-foreground">This week · {streak.activeDaysThisWeek} active {streak.activeDaysThisWeek === 1 ? 'day' : 'days'}</p><ul className="grid grid-cols-7 gap-2">{streak.days.map((day) => <li key={day.date} className="flex min-w-0 flex-col items-center gap-2" aria-label={`${new Date(day.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}: ${day.count ? `${day.count} ${day.count === 1 ? 'activity' : 'activities'}` : day.future ? 'upcoming' : 'no activity'}`}>
        <span className="text-[11px] text-muted-foreground" aria-hidden="true">{new Date(day.date).toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
        <span aria-hidden="true" className={cn('flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold tabular-nums', day.count ? 'bg-primary text-primary-foreground' : day.future ? 'border border-dashed border-border text-muted-foreground' : 'bg-muted text-muted-foreground')}>{day.count ? <Check className="h-4 w-4" /> : new Date(day.date).getDate()}</span>
      </li>)}</ul></div>
    </div>
    <p className="mt-5 text-xs text-muted-foreground">A completed workout or logged run counts. {period === 'week' ? 'Consecutive weeks with activity; the current week stays open.' : 'Consecutive active days; yesterday’s streak stays open until today ends.'} Independent of dashboard filters.</p>
  </section>;
}

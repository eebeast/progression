import type { Run, WorkoutSession } from '@/types';
import { dateKey, keyToOrdinal } from './activity';

export type StreakPeriod = 'week' | 'day';

/** Calendar streaks from completed workouts and runs; one activity date counts once. */
export function activityStreaks(sessions: WorkoutSession[], runs: Run[], period: StreakPeriod, now = Date.now()) {
  const today = keyToOrdinal(dateKey(now));
  const dayCounts = new Map<number, number>();
  for (const activity of [...sessions.filter((session) => session.status === 'completed'), ...runs]) {
    if (!Number.isFinite(activity.date)) continue;
    const day = keyToOrdinal(dateKey(activity.date));
    if (day > today) continue;
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  }
  const unit = (day: number) => period === 'week' ? Math.floor((day + 3) / 7) : day;
  const active = [...new Set([...dayCounts.keys()].map(unit))].sort((a, b) => a - b);
  const activeSet = new Set(active);
  let best = 0; let length = 0;
  active.forEach((value, index) => {
    length = index && value === active[index - 1] + 1 ? length + 1 : 1;
    best = Math.max(best, length);
  });
  const currentUnit = unit(today);
  let end = activeSet.has(currentUnit) ? currentUnit : currentUnit - 1;
  let current = 0;
  while (activeSet.has(end)) { current++; end--; }
  const date = new Date(now); date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (date.getDay() + 6) % 7);
  const monday = keyToOrdinal(dateKey(date.getTime()));
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(date); day.setDate(day.getDate() + index);
    return { date: day.getTime(), count: dayCounts.get(monday + index) ?? 0, future: monday + index > today };
  });
  return { current, best, days, activeThisPeriod: activeSet.has(currentUnit), activeDaysThisWeek: days.filter((day) => day.count > 0).length };
}

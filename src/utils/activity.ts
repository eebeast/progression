/**
 * Activity / streak helpers. Everything works in LOCAL calendar dates, keyed as
 * `YYYY-MM-DD`. We convert keys to an integer "ordinal" (days since the UTC epoch
 * of that local Y-M-D) purely to compare consecutiveness — this is DST-proof
 * because every key is mapped the same way.
 */

const pad = (n: number) => String(n).padStart(2, '0');

export function dateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(): string {
  return dateKey(Date.now());
}

export function keyToOrdinal(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

/** Local-midnight timestamp for a `YYYY-MM-DD` key (used for date inputs). */
export function keyToLocalMidnight(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

/**
 * best  = longest run of consecutive active dates, ever.
 * current = consecutive active dates ending today; if today is inactive, the run
 *           ending yesterday still counts (so it doesn't reset before you train
 *           today). If neither today nor yesterday is active, current = 0.
 */
export function computeStreaks(activeKeys: Set<string>): { current: number; best: number } {
  const ordinals = [...activeKeys].map(keyToOrdinal).sort((a, b) => a - b);

  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const o of ordinals) {
    run = prev !== null && o === prev + 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = o;
  }

  const set = new Set(ordinals);
  const today = keyToOrdinal(todayKey());
  let end: number | null = null;
  if (set.has(today)) end = today;
  else if (set.has(today - 1)) end = today - 1;

  let current = 0;
  if (end !== null) {
    let o = end;
    while (set.has(o)) {
      current++;
      o--;
    }
  }

  return { current, best };
}

/** Monday-anchored ordinal for the week containing `now`. */
function mondayOrdinal(now = new Date()): number {
  const day = now.getDay(); // 0 = Sun … 6 = Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
  return keyToOrdinal(dateKey(monday.getTime()));
}

/** Number of active days in the current (Mon-start) week. */
export function weeklyActiveCount(activeKeys: Set<string>): number {
  const monday = mondayOrdinal();
  const set = new Set([...activeKeys].map(keyToOrdinal));
  let count = 0;
  for (let i = 0; i < 7; i++) if (set.has(monday + i)) count++;
  return count;
}

/** Is the local date of `ts` within the current Mon-start week? */
export function isInCurrentWeek(ts: number): boolean {
  const ord = keyToOrdinal(dateKey(ts));
  const monday = mondayOrdinal();
  return ord >= monday && ord <= monday + 6;
}

/** Is `ts` within the current calendar month? */
export function isInCurrentMonth(ts: number): boolean {
  const now = new Date();
  const d = new Date(ts);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

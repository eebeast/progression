/**
 * Derived running metrics — simple values from distance + duration. No goals,
 * predictions, or advice. Guarded: return null when distance or duration is 0,
 * and render that null as "—".
 */

export interface RunMetricInput {
  distanceKm: number;
  durationSeconds: number;
}

function valid(run: RunMetricInput): boolean {
  return run.distanceKm > 0 && run.durationSeconds > 0;
}

export function paceSecondsPerKm(run: RunMetricInput): number | null {
  if (!valid(run)) return null;
  return run.durationSeconds / run.distanceKm;
}

export function speedKmh(run: RunMetricInput): number | null {
  if (!valid(run)) return null;
  return run.distanceKm / (run.durationSeconds / 3600);
}

/** "m:ss /km", e.g. "5:30 /km". "—" when undefined. */
export function formatPace(run: RunMetricInput): string {
  const pace = paceSecondsPerKm(run);
  if (pace === null) return '—';
  let m = Math.floor(pace / 60);
  let s = Math.round(pace % 60);
  if (s === 60) {
    m += 1;
    s = 0;
  }
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

/** "10.9 km/h" (1 decimal). "—" when undefined. */
export function formatSpeed(run: RunMetricInput): string {
  const speed = speedKmh(run);
  if (speed === null) return '—';
  return `${speed.toFixed(1)} km/h`;
}

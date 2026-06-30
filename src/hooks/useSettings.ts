import { useRepo } from '@/storage/RepositoryProvider';
import { useObservable } from '@/hooks/useObservable';
import { DEFAULT_SETTINGS } from '@/storage/defaults';
import type { Settings } from '@/types';

/** Live settings, falling back to defaults while the repository loads. */
export function useSettings(): { settings: Settings; loading: boolean } {
  const repo = useRepo();
  const settings = useObservable(() => repo.observeSettings(), [repo]);

  // Merge over defaults so rows saved before a field existed still resolve, then
  // sanitize numerics so a persisted NaN/undefined never reaches the UI.
  const merged = { ...DEFAULT_SETTINGS, ...(settings ?? {}) };
  const num = (v: number, fallback: number) => (Number.isFinite(v) ? v : fallback);

  return {
    settings: {
      ...merged,
      weeklyGoal: num(merged.weeklyGoal, DEFAULT_SETTINGS.weeklyGoal),
      weightIncrement: num(merged.weightIncrement, DEFAULT_SETTINGS.weightIncrement),
    },
    loading: settings === undefined,
  };
}

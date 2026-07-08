import type { WorkoutSession, WorkoutTemplate } from '@/types';

/**
 * Today's workout: the next template (by order) after the last *completed*
 * session's template; if none completed, the first template. Pure derivation —
 * `templates` must already be in program order.
 */
export function deriveTodayTemplate(
  templates: WorkoutTemplate[],
  lastCompleted: WorkoutSession | null,
): WorkoutTemplate | null {
  if (templates.length === 0) return null;
  if (!lastCompleted) return templates[0];

  const lastTemplate = templates.find((t) => t.id === lastCompleted.templateId);
  if (!lastTemplate) return templates[0];

  const idx = templates.findIndex((t) => t.id === lastTemplate.id);
  return templates[(idx + 1) % templates.length];
}

/**
 * The reorderable rotation: templates in program order starting at `current`,
 * excluding the `anchorId` template (the last-completed one, which loops back
 * and is not a future day). Row 0 is today, then tomorrow, then next, …
 *
 * Persisting a reordered rotation as `[anchorId, ...rotation]` keeps
 * `deriveTodayTemplate` reproducing exactly this sequence.
 */
export function getRotation(
  templates: WorkoutTemplate[],
  current: WorkoutTemplate | null,
  anchorId: string | null,
): WorkoutTemplate[] {
  if (!current || templates.length === 0) return [];
  const startIdx = templates.findIndex((t) => t.id === current.id);
  if (startIdx < 0) return [];
  const seq: WorkoutTemplate[] = [];
  for (let i = 0; i < templates.length; i++) {
    const t = templates[(startIdx + i) % templates.length];
    if (anchorId && t.id === anchorId) continue;
    seq.push(t);
  }
  return seq;
}

/** The N templates that follow `current` in program order (wrapping). */
export function getUpcoming(
  templates: WorkoutTemplate[],
  current: WorkoutTemplate | null,
  count: number,
): WorkoutTemplate[] {
  if (!current || templates.length <= 1) return [];
  const startIdx = templates.findIndex((t) => t.id === current.id);
  if (startIdx < 0) return [];
  const result: WorkoutTemplate[] = [];
  for (let i = 1; i <= count; i++) {
    result.push(templates[(startIdx + i) % templates.length]);
  }
  return result;
}

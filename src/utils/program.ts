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

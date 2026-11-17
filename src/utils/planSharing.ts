import type { SharedPlanInput } from '@/storage/repository';
import type { WorkoutTemplate } from '@/types';

export const MAX_PLAN_FILE_BYTES = 1024 * 1024;

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 500;
}

/** Validate the whole file before any persistence; do not accept full backups. */
export function parsePlanFile(contents: string): SharedPlanInput[] {
  let data: unknown;
  try {
    data = JSON.parse(contents);
  } catch {
    throw new Error('Could not read this JSON file. Choose a Progression plans file.');
  }
  if (!object(data) || data.app !== 'progression-plans' || data.version !== 1 ||
      !Array.isArray(data.plans) || data.plans.length === 0 || data.plans.length > 100) {
    throw new Error('Choose a Progression plans file (version 1), not a full backup.');
  }
  return data.plans.map((plan, index) => {
    if (!object(plan) || !text(plan.name) ||
        (plan.estimatedMinutes !== undefined &&
          (typeof plan.estimatedMinutes !== 'number' || !Number.isFinite(plan.estimatedMinutes) || plan.estimatedMinutes <= 0)) ||
        !Array.isArray(plan.exercises) || plan.exercises.length === 0 || plan.exercises.length > 100) {
      throw new Error(`Plan ${index + 1} needs a name, exercises, and valid minutes if provided.`);
    }
    const exercises = plan.exercises.map((exercise, exerciseIndex): SharedPlanInput['exercises'][number] => {
      if (!object(exercise) || !text(exercise.name) ||
          !Number.isSafeInteger(exercise.targetSets) || (exercise.targetSets as number) < 1 ||
          !text(exercise.targetRepRange) ||
          (exercise.metric !== undefined && exercise.metric !== 'reps' && exercise.metric !== 'time')) {
        throw new Error(`Check exercise ${exerciseIndex + 1} in plan ${index + 1}: name, sets, rep range, or metric is invalid.`);
      }
      return {
        name: exercise.name.trim(),
        targetSets: exercise.targetSets as number,
        targetRepRange: exercise.targetRepRange.trim(),
        metric: exercise.metric ?? 'reps',
      };
    });
    return { name: plan.name.trim(), estimatedMinutes: plan.estimatedMinutes as number | undefined, exercises };
  });
}

/** Explicitly pick portable fields so exports contain no history or settings. */
export function serializePlans(templates: WorkoutTemplate[]): string {
  return JSON.stringify({
    app: 'progression-plans',
    version: 1,
    plans: [...templates].sort((a, b) => a.order - b.order).map((plan) => ({
      name: plan.name,
      estimatedMinutes: plan.estimatedMinutes,
      exercises: [...plan.exercises].sort((a, b) => a.order - b.order).map((exercise) => ({
        name: exercise.name,
        targetSets: exercise.targetSets,
        targetRepRange: exercise.targetRepRange,
        metric: exercise.metric ?? 'reps',
      })),
    })),
  }, null, 2);
}

export function downloadPlans(templates: WorkoutTemplate[]): void {
  const blob = new Blob([serializePlans(templates)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'progression-plans.json';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Give the browser time to start the download before releasing its URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

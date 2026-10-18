import { describe, expect, it } from 'vitest';
import { buildWorkoutRecap } from '@/utils/shareSummary';
import type { ExerciseLog, Unit } from '@/types';

function set(
  exerciseId: string,
  name: string,
  weight: number,
  reps: number,
  setNumber: number,
  warmup = false,
): ExerciseLog {
  return {
    id: `${exerciseId}-${setNumber}`,
    sessionId: 's1',
    exerciseId,
    exerciseName: name,
    setNumber,
    weight,
    reps,
    isWarmup: warmup,
    timestamp: setNumber,
  };
}

const logs: ExerciseLog[] = [
  set('e1', 'Bench', 40, 10, 1, true), // warm-up — excluded
  set('e1', 'Bench', 100, 5, 2),
  set('e1', 'Bench', 100, 8, 3),
  set('e2', 'Squat', 140, 5, 1),
];

function recap(over: Partial<Parameters<typeof buildWorkoutRecap>[0]> = {}) {
  return buildWorkoutRecap({
    templateName: 'Push',
    date: Date.UTC(2026, 0, 2),
    durationMs: 42 * 60000,
    logs,
    unit: 'kg' as Unit,
    feeling: 'good',
    notes: 'felt strong',
    ...over,
  }).split('\n');
}

describe('buildWorkoutRecap', () => {
  it('builds the header, per-exercise lines, and trailing block (warm-ups excluded)', () => {
    const lines = recap();
    expect(lines[0].startsWith('Push — ')).toBe(true);
    expect(lines[1]).toBe('42m · 2 exercises · 3 sets'); // warm-up not counted
    expect(lines[2]).toBe('');
    expect(lines[3]).toBe('Bench: 100kg×5, 100kg×8');
    expect(lines[4]).toBe('Squat: 140kg×5');
    expect(lines[5]).toBe('');
    expect(lines[6]).toBe('Felt: Good');
    expect(lines[7]).toBe('felt strong');
  });

  it('omits the Felt/notes block when neither is set', () => {
    const lines = recap({ feeling: null, notes: '   ' });
    expect(lines).toHaveLength(5); // header(2) + blank + 2 exercises
    expect(lines.some((l) => l.startsWith('Felt:'))).toBe(false);
  });

  it('respects the active unit', () => {
    const lines = recap({ unit: 'lb' as Unit });
    expect(lines[3]).toBe('Bench: 100lb×5, 100lb×8');
  });
});

it('formats timed and zero-external-weight sets without inventing load', () => {
  const lines = recap({ logs: [{ ...set('hold', 'Plank', 0, 45, 1), metric: 'time' }, set('push', 'Push-up', 0, 10, 1)] });
  expect(lines).toContain('Plank: 45s');
  expect(lines).toContain('Push-up: 10');
});

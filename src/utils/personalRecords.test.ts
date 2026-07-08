import { describe, expect, it } from 'vitest';
import { getRecord, getRecordSetIds } from '@/utils/personalRecords';
import type { ExerciseLog } from '@/types';

let seq = 0;
function log(
  weight: number,
  reps: number,
  opts: { warmup?: boolean; ts?: number; id?: string } = {},
): ExerciseLog {
  seq += 1;
  return {
    id: opts.id ?? `l${seq}`,
    sessionId: 's1',
    exerciseId: 'e1',
    exerciseName: 'Bench',
    setNumber: seq,
    weight,
    reps,
    isWarmup: opts.warmup,
    timestamp: opts.ts ?? seq,
  };
}

describe('getRecord', () => {
  it('returns null with no logs', () => {
    expect(getRecord([])).toBeNull();
  });

  it('returns null when every set is a warm-up', () => {
    expect(getRecord([log(200, 1, { warmup: true }), log(180, 2, { warmup: true })])).toBeNull();
  });

  it('picks the heaviest weight, then most reps at that weight', () => {
    // 105 is heaviest; the 100kg×8 does not count because 105 is heavier.
    expect(getRecord([log(100, 5), log(105, 3), log(100, 8)])).toEqual({ weight: 105, reps: 3 });
  });

  it('takes the most reps at the heaviest weight regardless of order', () => {
    expect(getRecord([log(100, 5), log(100, 8), log(100, 3)])).toEqual({ weight: 100, reps: 8 });
  });

  it('ignores warm-ups even when heavier', () => {
    expect(getRecord([log(200, 1, { warmup: true }), log(100, 5)])).toEqual({ weight: 100, reps: 5 });
  });
});

describe('getRecordSetIds', () => {
  it('never flags the first working set (it only establishes the baseline)', () => {
    expect(getRecordSetIds([log(100, 5, { id: 'a', ts: 1 })])).toEqual(new Set());
  });

  it('flags sets that beat the prior best (heavier, or same weight for more reps)', () => {
    const logs = [
      log(100, 5, { id: 'a', ts: 1 }),
      log(105, 3, { id: 'b', ts: 2 }), // beats weight
      log(105, 6, { id: 'c', ts: 3 }), // beats reps at 105
      log(105, 4, { id: 'd', ts: 4 }), // does not beat 6
    ];
    expect(getRecordSetIds(logs)).toEqual(new Set(['b', 'c']));
  });

  it('is order-independent (sorts by timestamp) and skips warm-ups', () => {
    const logs = [
      log(105, 6, { id: 'c', ts: 3 }),
      log(999, 9, { id: 'w', ts: 2, warmup: true }),
      log(100, 5, { id: 'a', ts: 1 }),
      log(105, 3, { id: 'b', ts: 2.5 }),
    ];
    // Timeline (working only): a(100x5) baseline, b(105x3) beats weight, c(105x6) beats reps.
    expect(getRecordSetIds(logs)).toEqual(new Set(['b', 'c']));
  });
});

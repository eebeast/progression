import { describe, expect, it } from 'vitest';
import {
  getRecord,
  getRecordSetIds,
  getSessionProgress,
  getTopSets,
  type DatedSet,
} from '@/utils/personalRecords';
import type { ExerciseLog } from '@/types';

let seq = 0;
function log(
  weight: number,
  reps: number,
  opts: { warmup?: boolean; ts?: number; id?: string; session?: string } = {},
): ExerciseLog {
  seq += 1;
  return {
    id: opts.id ?? `l${seq}`,
    sessionId: opts.session ?? 's1',
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

describe('getTopSets', () => {
  const s = (weight: number, reps: number, date: number, warmup = false): DatedSet => ({
    weight,
    reps,
    date,
    isWarmup: warmup,
  });

  it('returns the heaviest sets first, then most reps', () => {
    expect(getTopSets([s(100, 5, 1), s(105, 3, 2), s(100, 8, 3)])).toEqual([
      { weight: 105, reps: 3, date: 2 },
      { weight: 100, reps: 8, date: 3 },
      { weight: 100, reps: 5, date: 1 },
    ]);
  });

  it('dedups identical weight×reps, keeping the most recent date', () => {
    expect(getTopSets([s(20, 12, 1), s(20, 12, 5)])).toEqual([{ weight: 20, reps: 12, date: 5 }]);
  });

  it('excludes warm-ups', () => {
    expect(getTopSets([s(200, 1, 1, true), s(100, 5, 2)])).toEqual([{ weight: 100, reps: 5, date: 2 }]);
  });

  it('limits to the requested count', () => {
    const many = [s(50, 5, 1), s(40, 5, 2), s(30, 5, 3), s(20, 5, 4), s(10, 5, 5)];
    const top = getTopSets(many, 4);
    expect(top).toHaveLength(4);
    expect(top[0]).toEqual({ weight: 50, reps: 5, date: 1 });
  });
});

describe('getSessionProgress', () => {
  it('returns one point per session in chronological order', () => {
    const logs = [
      log(100, 5, { session: 'b' }),
      log(90, 5, { session: 'a' }),
    ];
    const dates = new Map([
      ['a', 10],
      ['b', 20],
    ]);
    const points = getSessionProgress(logs, dates);
    expect(points.map((p) => p.sessionId)).toEqual(['a', 'b']);
    expect(points.map((p) => p.date)).toEqual([10, 20]);
  });

  it('uses the heaviest working set, then most reps, for the top values', () => {
    const logs = [
      log(100, 5, { session: 'a' }),
      log(105, 3, { session: 'a' }),
      log(105, 6, { session: 'a' }),
    ];
    const [p] = getSessionProgress(logs, new Map([['a', 1]]));
    expect(p.topWeight).toBe(105);
    expect(p.topReps).toBe(6);
  });

  it('excludes warm-ups from the count and the top set', () => {
    const logs = [
      log(200, 1, { session: 'a', warmup: true }),
      log(100, 5, { session: 'a' }),
      log(110, 4, { session: 'a' }),
    ];
    const [p] = getSessionProgress(logs, new Map([['a', 1]]));
    expect(p.workingSets).toBe(2);
    expect(p.topWeight).toBe(110);
  });

  it('skips sessions with only warm-ups', () => {
    const logs = [
      log(200, 1, { session: 'a', warmup: true }),
      log(100, 5, { session: 'b' }),
    ];
    const dates = new Map([
      ['a', 1],
      ['b', 2],
    ]);
    expect(getSessionProgress(logs, dates).map((p) => p.sessionId)).toEqual(['b']);
  });

  it('drops logs whose session has no date (not completed)', () => {
    const logs = [
      log(100, 5, { session: 'a' }),
      log(120, 5, { session: 'ghost' }),
    ];
    expect(getSessionProgress(logs, new Map([['a', 1]])).map((p) => p.sessionId)).toEqual(['a']);
  });
});

import { describe, expect, it } from 'vitest';
import { canonicalJson, reconcileBackups } from './reconciliation';
import { parseLegacyBackup } from './legacyBackup';

const backup = (exercises: unknown[]) => parseLegacyBackup({ app: 'workout-tracker', version: 1, exportedAt: 1,
  data: { settings: [], exercises, templates: [], sessions: [], logs: [] } }).backup;

describe('backup reconciliation', () => {
  it('compares full records including unknown legacy fields without rewriting them', () => {
    expect(reconcileBackups(backup([{ id: 'a', unusual: { old: 1 } }, { id: 'b' }]),
      backup([{ unusual: { old: 2 }, id: 'a' }, { id: 'c' }]))).toEqual([
      { store: 'exercises', id: 'a', kind: 'changed' },
      { store: 'exercises', id: 'b', kind: 'missing' },
      { store: 'exercises', id: 'c', kind: 'extra' },
    ]);
  });
  it('ignores key order, preserves array order and treats absent optional stores as empty', () => {
    expect(canonicalJson({ b: 2, a: [1, 2] })).toBe(canonicalJson({ a: [1, 2], b: 2 }));
    expect(canonicalJson([1, 2])).not.toBe(canonicalJson([2, 1]));
    expect(reconcileBackups(backup([]), backup([]))).toEqual([]);
  });
});

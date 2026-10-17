import { describe, expect, it } from 'vitest';
import { parseLegacyBackup } from '@/storage/legacyBackup';

function backup(data: Record<string, unknown>) {
  return {
    app: 'workout-tracker',
    version: 1,
    exportedAt: 1,
    data: {
      settings: [],
      exercises: [],
      templates: [],
      sessions: [],
      logs: [],
      ...data,
    },
  };
}

describe('parseLegacyBackup', () => {
  it('accepts older backups without run and body-weight stores', () => {
    const result = parseLegacyBackup(backup({ exercises: [{ id: 'e1', name: 'Squat' }] }));

    expect(result.report.counts).toEqual({
      settings: 0,
      exercises: 1,
      templates: 0,
      sessions: 0,
      logs: 0,
      runs: 0,
      bodyWeights: 0,
    });
    expect(result.backup.data.exercises).toEqual([{ id: 'e1', name: 'Squat' }]);
    expect(result.report.warnings).toEqual([]);
  });

  it('rejects duplicate IDs rather than allowing bulkPut to overwrite a source record', () => {
    expect(() =>
      parseLegacyBackup(backup({ exercises: [{ id: 'same' }, { id: 'same' }] })),
    ).toThrow('duplicate id "same" in data.exercises');
  });

  it('reports unresolved references and malformed timestamps without rewriting source records', () => {
    const raw = backup({
      exercises: [
        { id: 'e1', name: ' Bench Press ' },
        { id: 'e2', name: 'bench press' },
      ],
      sessions: [{ id: 's1' }],
      templates: [{ id: 't1', exercises: [{ exerciseId: 'missing' }] }],
      logs: [{ id: 'l1', sessionId: 'missing-session', exerciseId: 'missing-exercise', timestamp: 'old' }],
    });

    const result = parseLegacyBackup(raw);
    expect(result.backup.data.logs[0]).toEqual(raw.data.logs[0]);
    expect(result.report.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('normalize to the same value'),
        expect.stringContaining('references missing exercise'),
        expect.stringContaining('reference missing sessions'),
        expect.stringContaining('reference missing exercises'),
        expect.stringContaining('malformed timestamp'),
      ]),
    );
  });

  it('rejects unknown backup versions', () => {
    expect(() => parseLegacyBackup({ ...backup({}), version: 2 })).toThrow('not a supported workout backup');
  });

  it('rejects duplicate IDs in every record collection before data is cleared', () => {
    expect(() =>
      parseLegacyBackup(
        backup({
          sessions: [{ id: 's1' }, { id: 's1' }],
        }),
      ),
    ).toThrow('duplicate id "s1" in data.sessions');
  });
});

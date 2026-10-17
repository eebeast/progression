import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DexieRepository } from './DexieRepository';
import { DEFAULT_SETTINGS } from '@/storage/defaults';
import type { Observable } from '@/storage/repository';
import type { BackupShape } from '@/storage/legacyBackup';
import type { WorkoutTemplate } from '@/types';

const repo = new DexieRepository();
const template: WorkoutTemplate = {
  id: 'plan', name: 'Original plan', order: 0, estimatedMinutes: 30,
  createdAt: 1, updatedAt: 1,
  exercises: [{ exerciseId: 'exercise', name: 'Squat', targetSets: 3, targetRepRange: '8-12', order: 0 }],
};
const source: BackupShape = {
  app: 'workout-tracker', version: 1, exportedAt: 10,
  data: {
    settings: [DEFAULT_SETTINGS],
    exercises: [{ id: 'exercise', name: 'Squat', createdAt: 1 }],
    templates: [template],
    sessions: [{ id: 'session', templateId: 'plan', templateName: 'Old plan name', date: 2,
      startTime: 2, endTime: 3, notes: '', feeling: null, status: 'completed' }],
    logs: [{ id: 'set', sessionId: 'session', exerciseId: 'exercise', exerciseName: 'Old squat name',
      setNumber: 1, weight: 45, reps: 8, timestamp: 2 }],
    runs: [{ id: 'run', date: 4, distanceKm: 5, durationSeconds: 1800, createdAt: 4 }],
    bodyWeights: [{ id: 'weight', date: 5, weight: 70, createdAt: 5 }],
  },
};

function file(value: unknown): File {
  return { text: async () => JSON.stringify(value) } as File;
}

function first<T>(observable: Observable<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const subscription = observable.subscribe({
      next(value) { subscription.unsubscribe(); resolve(value); },
      error: reject,
    });
  });
}

async function exportBackup(): Promise<BackupShape> {
  let blob: Blob | undefined;
  vi.stubGlobal('URL', {
    createObjectURL(value: Blob) { blob = value; return 'blob:test'; },
    revokeObjectURL: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  try {
    await repo.exportData();
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(blob!);
    });
    return JSON.parse(text);
  } finally {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  }
}

beforeEach(async () => { await repo.importData(file(source)); });

describe('IndexedDB persistence', () => {
  it('round-trips every collection and re-imports without changing IDs or values', async () => {
    await repo.importData(file(source));
    expect((await exportBackup()).data).toEqual(source.data);
    const reopened = new DexieRepository();
    expect(await first(reopened.observeSessionLogs('session'))).toEqual(source.data.logs);
    expect(await first(reopened.observeRuns())).toEqual(source.data.runs);
  });

  it('rejects duplicate template IDs before replacing existing data', async () => {
    await expect(repo.importData(file({ ...source, data: { ...source.data, templates: [template, template] } })))
      .rejects.toThrow('duplicate id');
    expect((await exportBackup()).data).toEqual(source.data);
  });

  it('rolls back every store if replacement fails part way through', async () => {
    const put = IDBObjectStore.prototype.put;
    const failure = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, ...args) {
      if (this.name === 'runs') throw new DOMException('Storage full', 'QuotaExceededError');
      return put.apply(this, args);
    });
    try {
      await expect(repo.importData(file({ ...source, data: { ...source.data, exercises: [] } }))).rejects.toThrow();
    } finally {
      failure.mockRestore();
    }
    expect((await exportBackup()).data).toEqual(source.data);
  });

  it('snapshots prescriptions so plan edits and deletion cannot change an existing workout', async () => {
    const id = await repo.startSession(template);
    await repo.updateTemplate(template.id, { ...template, name: 'Changed', exercises: [] });
    await repo.deleteTemplate(template.id);
    const session = await first(repo.observeSession(id));
    expect(session?.templateName).toBe('Original plan');
    expect(session?.exercises).toEqual(template.exercises);
  });

  it('allocates distinct consecutive numbers for simultaneous set writes', async () => {
    const input = { sessionId: 'session', exerciseId: 'exercise', exerciseName: 'Squat', weight: 50, reps: 8 };
    await Promise.all([repo.addSet(input), repo.addSet(input), repo.addSet(input)]);
    const logs = await first(repo.observeSessionLogs('session'));
    expect(logs.map((log) => log.setNumber).sort()).toEqual([1, 2, 3, 4]);
    expect(new Set(logs.map((log) => log.id)).size).toBe(4);
  });

  it('seeds valid exercise references when templates are empty but a library exists', async () => {
    await repo.importData(file({ ...source, data: { ...source.data, templates: [] } }));
    await repo.ensureSeeded();
    const ids = new Set((await repo.listExercises()).map((exercise) => exercise.id));
    const templates = await first(repo.observeTemplates());
    expect(templates.length).toBeGreaterThan(0);
    expect(templates.flatMap((plan) => plan.exercises).every((exercise) => ids.has(exercise.exerciseId))).toBe(true);
    expect(await repo.listExercises()).toContainEqual(source.data.exercises[0]);
  });
});

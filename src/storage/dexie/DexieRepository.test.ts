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
  exercises: [{ assignmentId: 'assignment', exerciseId: 'exercise', name: 'Squat', targetSets: 3, targetRepRange: '8-12', order: 0 }],
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

describe('canonical exercise management', () => {
  it('persists explicit exercise categories through backup export', async () => {
    const id = await repo.createExercise({ name: 'My movement', category: 'Compound' });
    expect((await repo.createBackup()).data.exercises.find((exercise) => exercise.id === id)?.category).toBe('Compound');
    await repo.updateExercise(id, { category: 'Back' });
    expect((await repo.listExercises()).find((exercise) => exercise.id === id)?.category).toBe('Back');
  });
  it('renames future plans while preserving session and set name snapshots', async () => {
    const id = await repo.startSession(template);
    await repo.updateExercise('exercise', { name: 'Barbell squat', primaryMuscle: 'Quads' });
    expect((await repo.getTemplate('plan'))?.exercises[0].name).toBe('Barbell squat');
    expect((await first(repo.observeSession(id)))?.exercises?.[0].name).toBe('Squat');
    expect((await first(repo.observeSessionLogs('session')))[0].exerciseName).toBe('Old squat name');
  });
  it('merges references transactionally, keeps historical names and retains an audited source', async () => {
    const targetId = await repo.createExercise({ name: 'Canonical squat' });
    await repo.startSession(template);
    expect(await repo.previewExerciseMerge('exercise', targetId)).toEqual({ templates: 1, sessions: 1, sets: 1 });
    await repo.mergeExercises('exercise', targetId);
    expect((await first(repo.observeSessionLogs('session')))[0]).toMatchObject({ exerciseId: targetId, exerciseName: 'Old squat name' });
    expect((await repo.listExercises()).find((e) => e.id === 'exercise')).toMatchObject({ merge: { targetId }, archivedAt: expect.any(Number) });
    await expect(repo.mergeExercises('exercise', targetId)).rejects.toThrow();
  });
  it('archives an exercise without deleting recorded history', async () => {
    await repo.updateExercise('exercise', { archivedAt: 10 });
    expect(await first(repo.observeSessionLogs('session'))).toHaveLength(1);
    expect((await repo.getTemplate('plan'))?.exercises).toHaveLength(1);
  });
});

it('loads the requested four-day plan without changing history and reuses shared exercise identities', async () => {
  await repo.installFourDayPlan();
  const days = await first(repo.observeTemplates());
  expect(days.map((day) => day.name)).toEqual(['Pull', 'Push', 'Legs + Abs', 'Mix']);
  expect(days.map((day) => day.exercises.length)).toEqual([6, 6, 6, 7]);
  expect(days[0].exercises[0]).toMatchObject({ name: 'Weighted Pull-ups', targetSets: 3, targetRepRange: '6–10' });
  expect(days[2].exercises[2]).toMatchObject({ name: 'Dumbbell Lunges', targetRepRange: '10 each leg' });
  expect(days[1].exercises.find((e) => e.name === 'Dumbbell Lateral Raise')!.exerciseId)
    .toBe(days[3].exercises.find((e) => e.name === 'Dumbbell Lateral Raise')!.exerciseId);
  expect(days[2].exercises.find((e) => e.name === 'Ab Roller')!.exerciseId)
    .toBe(days[3].exercises.find((e) => e.name === 'Ab Roller')!.exerciseId);
  expect(await first(repo.observeSessionLogs('session'))).toEqual(source.data.logs);
  expect((await repo.getTemplate('plan'))?.archivedAt).toEqual(expect.any(Number));
  expect(await first(repo.observeTemplates(true))).toHaveLength(5);
  await repo.installFourDayPlan();
  expect(await first(repo.observeTemplates())).toHaveLength(4);
  expect(await first(repo.observeTemplates(true))).toHaveLength(5);
});

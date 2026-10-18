import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { DexieRepository } from '@/storage/dexie/DexieRepository';
import type { Observable } from '@/storage/repository';
import type { Operation, RemoteRecord } from './types';

const repositories: DexieRepository[] = [];
function repo(name = crypto.randomUUID(), account = 'project/account-a') {
  const value = new DexieRepository(name, account); repositories.push(value); return value;
}
function first<T>(source: Observable<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const subscription = source.subscribe({ next(value) { subscription.unsubscribe(); resolve(value); }, error: reject });
  });
}
const accepted = (operation: Operation): RemoteRecord[] => operation.mutations.map((m) => ({ ...m, version: m.baseVersion + 1 }));
afterEach(() => { repositories.forEach((value) => value.close()); repositories.length = 0; });

describe('account outbox', () => {
  it('persists one atomic operation across restart and retains it until acknowledgement', async () => {
    const name = crypto.randomUUID(); const a = repo(name);
    await a.createRun({ date: 1, distanceKm: 5, durationSeconds: 1500 });
    const operation = (await a.nextOperation(Date.now()))!;
    expect(operation.mutations).toHaveLength(1);
    a.close(); const reopened = repo(name);
    expect(await reopened.nextOperation(Date.now())).toEqual(operation);
    await reopened.deferOperation(operation, 'Network error', 0);
    expect((await reopened.nextOperation(Date.now()))?.id).toBe(operation.id);
    await reopened.acknowledge(operation, { status: 'accepted', records: accepted(operation) });
    expect(await reopened.nextOperation(Date.now())).toBeUndefined();
    expect(await first(reopened.observeRuns())).toHaveLength(1);
  });

  it('keeps later offline edits while an earlier version is acknowledged or pulled', async () => {
    const a = repo(); await a.createRun({ date: 1, distanceKm: 5, durationSeconds: 1500 });
    const firstOperation = (await a.nextOperation(Date.now()))!;
    const id = firstOperation.mutations[0].id;
    await a.updateRun(id, { distanceKm: 6 });
    await a.acknowledge(firstOperation, { status: 'accepted', records: accepted(firstOperation) });
    await a.applyChanges({ cursor: 1, hasMore: false, changes: accepted(firstOperation).map((m) => ({ ...m, sequence: 1 })) });
    expect((await first(a.observeRuns()))[0].distanceKm).toBe(6);
    const second = (await a.nextOperation(Date.now()))!;
    expect(second.mutations[0].baseVersion).toBe(1);
  });

  it('blocks dependent writes on conflict, preserves both versions and resolves current local intent', async () => {
    const a = repo(); await a.createRun({ date: 1, distanceKm: 5, durationSeconds: 1500 });
    const operation = (await a.nextOperation(Date.now()))!;
    const row = accepted(operation)[0];
    await a.updateRun(row.id, { distanceKm: 7 });
    await a.acknowledge(operation, { status: 'conflict', records: [{ ...row, version: 3, data: { ...row.data, distanceKm: 9 } }] });
    expect(await a.nextOperation(Date.now())).toBeUndefined();
    expect((await first(a.observeConflicts()))[0].records[0].data?.distanceKm).toBe(9);
    expect((await first(a.observeRuns()))[0].distanceKm).toBe(7);
    await a.resolveConflict(operation.id, 'local');
    const resolution = (await a.nextOperation(Date.now()))!;
    expect(resolution.id).not.toBe(operation.id);
    expect(resolution.mutations[0]).toMatchObject({ baseVersion: 3, data: { distanceKm: 7 } });
  });

  it('applies tombstones idempotently with the durable pull cursor', async () => {
    const a = repo(); const row: RemoteRecord = { store: 'runs', id: 'remote', version: 1,
      data: { id: 'remote', date: 1, distanceKm: 5, durationSeconds: 1500, createdAt: 1 } };
    await a.applyChanges({ cursor: 1, hasMore: false, changes: [{ ...row, sequence: 1 }] });
    expect(await first(a.observeRuns())).toHaveLength(1);
    const page = { cursor: 2, hasMore: false, changes: [{ ...row, data: null, version: 2, sequence: 2 }] };
    await a.applyChanges(page); await a.applyChanges(page);
    expect(await first(a.observeRuns())).toHaveLength(0);
    expect(await a.getCursor()).toBe(2);
    expect(await a.nextOperation(Date.now())).toBeUndefined();
  });

  it('separates accounts and does not generate random default plans on each device', async () => {
    const a = repo(); const b = repo(undefined, 'project/account-b');
    await a.ensureSeeded(); await b.ensureSeeded();
    await a.addBodyWeight({ date: 1, weight: 70 });
    expect(await first(b.observeBodyWeights())).toEqual([]);
    expect(await b.nextOperation(Date.now())).toBeUndefined();
    expect(await first(a.observeTemplates())).toEqual([]);
  });
});

describe('account import and dependencies', () => {
  it('imports idempotently and never replaces differing account records', async () => {
    const a = repo(); await a.ensureSeeded();
    const source = { app: 'workout-tracker', version: 1, exportedAt: 1, data: {
      settings: [], exercises: [], templates: [], sessions: [], logs: [],
      runs: [{ id: 'imported', date: 1, distanceKm: 2, durationSeconds: 600 }],
    } };
    const file = (value: unknown) => ({ text: async () => JSON.stringify(value) }) as File;
    await a.importData(file(source));
    await a.importData(file(source));
    expect((await first(a.observeSyncStatus())).pending).toBe(1);
    await expect(a.importData(file({ ...source, data: { ...source.data, runs: [{ ...source.data.runs[0], distanceKm: 3 }] } }))).rejects.toThrow('Import collision');
    expect((await first(a.observeRuns()))[0].distanceKm).toBe(2);
    expect((await a.createBackup()).recovery?.operations).toHaveLength(1);
  });
  it('does not send child records while their parent creation is deferred', async () => {
    const a = repo();
    await a.bulkCreateExercises([{ id: 'e', name: 'Squat', createdAt: 1 }]);
    const parent = (await a.nextOperation(Date.now()))!;
    await a.createTemplate({ name: 'Legs', estimatedMinutes: 30, exercises: [{ exerciseId: 'e', name: 'Squat', targetSets: 3, targetRepRange: '8', order: 0 }] });
    await a.deferOperation(parent, 'Network unavailable', Date.now() + 60000);
    expect(await a.nextOperation(Date.now())).toBeUndefined();
  });
});

describe('migration and dependent conflict recovery', () => {
  it('queues a large import in resumable bounded parent-first batches', async () => {
    const a = repo();
    const backup = { app: 'workout-tracker', version: 1, exportedAt: 1, data: {
      settings: [], exercises: [{ id: 'e', name: 'Squat', createdAt: 1 }], templates: [],
      sessions: [{ id: 's', templateId: '', templateName: 'Legacy', date: 1, startTime: 1, endTime: 2, status: 'completed', notes: '', feeling: null }],
      logs: Array.from({ length: 1100 }, (_, i) => ({ id: `set-${i}`, sessionId: 's', exerciseId: 'e', exerciseName: 'Squat', setNumber: i + 1, weight: 20, reps: 5, timestamp: i })),
    } };
    await a.importData({ text: async () => JSON.stringify(backup) } as File);
    const operations = (await a.createBackup()).recovery!.operations;
    expect(operations.length).toBeGreaterThan(1);
    expect(operations.every((op) => op.mutations.length <= 400)).toBe(true);
    expect(operations[0].mutations.slice(0, 2).map((m) => m.store)).toEqual(['exercises', 'sessions']);
    expect(operations.flatMap((op) => op.mutations).filter((m) => m.store === 'logs')).toHaveLength(1100);
  });
  it('retains a remotely deleted parent while an offline child needs review and restores both in dependency order', async () => {
    const a = repo();
    await a.applyChanges({ cursor: 2, hasMore: false, changes: [
      { sequence: 1, store: 'exercises', id: 'e', version: 1, data: { id: 'e', name: 'Squat', createdAt: 1 } },
      { sequence: 2, store: 'sessions', id: 's', version: 1, data: { id: 's', templateId: '', templateName: 'Plan', date: 1, startTime: 1, endTime: null, status: 'active', notes: '', feeling: null } },
    ] });
    await a.setRestTimer('s', 100);
    const parent = (await a.nextOperation(Date.now()))!;
    await a.addSet({ sessionId: 's', exerciseId: 'e', exerciseName: 'Squat', reps: 5, weight: 20 });
    const tombstone = { store: 'sessions' as const, id: 's', version: 2, data: null };
    await a.acknowledge(parent, { status: 'conflict', records: [tombstone] });
    await a.applyChanges({ cursor: 3, hasMore: false, changes: [{ ...tombstone, sequence: 3 }] });
    expect(await first(a.observeSession('s'))).toBeDefined();
    expect(await first(a.observeSessionLogs('s'))).toHaveLength(1);
    await a.resolveConflict(parent.id, 'local');
    const restored = (await a.nextOperation(Date.now()))!;
    expect(restored.mutations.map((m) => m.store)).toEqual(['sessions', 'logs']);
    expect(restored.mutations[0].baseVersion).toBe(2);
    expect((await a.createBackup()).recovery!.operations).toHaveLength(1);
  });
  it('restores a conflicted backup into local-only review without replaying the foreign outbox', async () => {
    const source = repo(); await source.createRun({ date: 1, distanceKm: 5, durationSeconds: 1000 });
    const op = (await source.nextOperation(Date.now()))!;
    await source.acknowledge(op, { status: 'conflict', records: [{ ...accepted(op)[0], version: 3, data: { ...op.mutations[0].data, distanceKm: 9 } }] });
    const backup = await source.createBackup();
    const local = new DexieRepository(crypto.randomUUID()); repositories.push(local);
    await local.importData({ text: async () => JSON.stringify(backup) } as File);
    expect(await local.nextOperation(Date.now())).toBeUndefined();
    expect((await local.createBackup()).data.runs![0].distanceKm).toBe(5);
    const conflict = (await first(local.observeConflicts()))[0];
    await local.resolveConflict(conflict.id, 'remote');
    expect((await local.createBackup()).data.runs![0].distanceKm).toBe(9);
    expect(await local.nextOperation(Date.now())).toBeUndefined();
  });
});

it('preserves rotation when a journal page delivers order before its new template records', async () => {
  const a = repo();
  await a.applyChanges({ cursor: 1, hasMore: true, changes: [{ store: 'programOrder', id: 'singleton', version: 1, sequence: 1,
    data: { id: 'singleton', orderedIds: ['pull', 'push'] } }] });
  await a.applyChanges({ cursor: 3, hasMore: false, changes: ['push', 'pull'].map((id, index) => ({ store: 'templates' as const, id, version: 1, sequence: index + 2,
    data: { id, name: id, exercises: [], createdAt: 1, updatedAt: 1, estimatedMinutes: 30 } })) });
  expect((await first(a.observeTemplates())).map((row) => row.id)).toEqual(['pull', 'push']);
});

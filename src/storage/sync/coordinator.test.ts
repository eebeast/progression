import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DexieRepository } from '@/storage/dexie/DexieRepository';
import { SyncCoordinator } from './coordinator';
import type { Change, Operation, PushResult, SyncTransport } from './types';

const repositories: DexieRepository[] = [];
function device() { const repo = new DexieRepository(crypto.randomUUID(), 'test/account'); repositories.push(repo); return repo; }
afterEach(() => { vi.unstubAllGlobals(); repositories.forEach((repo) => repo.close()); repositories.length = 0; });

/** Test server boundary: stable IDs, revisions, receipts and deterministic change cursor. */
class Server implements SyncTransport {
  changes: Change[] = [];
  receipts = new Map<string, PushResult>();
  loseNextResponse = false;
  async push(operation: Operation): Promise<PushResult> {
    const receipt = this.receipts.get(operation.id);
    if (receipt) return receipt;
    const current = operation.mutations.map((m) => [...this.changes].reverse().find((c) => c.store === m.store && c.id === m.id) ?? { ...m, version: 0, data: null });
    if (operation.mutations.some((m, i) => m.baseVersion !== current[i].version)) {
      return { status: 'conflict', records: current };
    }
    const records = operation.mutations.map((m) => ({ ...m, version: m.baseVersion + 1 }));
    for (const row of records) this.changes.push({ ...row, sequence: this.changes.length + 1 });
    const result: PushResult = { status: 'accepted', records };
    this.receipts.set(operation.id, result);
    if (this.loseNextResponse) { this.loseNextResponse = false; throw new Error('Connection lost after commit'); }
    return result;
  }
  async pull(cursor: number) { return { changes: this.changes.filter((c) => c.sequence > cursor), cursor: this.changes.length, hasMore: false }; }
}

describe('two-client sync', () => {
  it('retries a committed write with the same ID after a lost response and delivers it once to another client', async () => {
    const a = device(); const b = device(); const server = new Server();
    await a.createRun({ date: 1, distanceKm: 5, durationSeconds: 1500 });
    const pending = (await a.nextOperation(Date.now()))!;
    server.loseNextResponse = true;
    await new SyncCoordinator(a, server).sync();
    expect(server.changes).toHaveLength(1);
    await a.retrySync();
    expect((await a.nextOperation(Date.now()))!.id).toBe(pending.id);
    await new SyncCoordinator(a, server).sync();
    await new SyncCoordinator(b, server).sync();
    expect(server.changes).toHaveLength(1);
    expect((await b.createBackup()).data.runs).toEqual((await a.createBackup()).data.runs);
    expect(await a.nextOperation(Date.now())).toBeUndefined();
  });
  it('preserves conflicting edits on both clients and never silently resurrects a deleted record', async () => {
    const a = device(); const b = device(); const server = new Server();
    const syncA = new SyncCoordinator(a, server); const syncB = new SyncCoordinator(b, server);
    await a.createRun({ date: 1, distanceKm: 5, durationSeconds: 1500 }); await syncA.sync(); await syncB.sync();
    const id = (await a.createBackup()).data.runs![0].id;
    await a.deleteRun(id); await b.updateRun(id, { distanceKm: 9 });
    await syncA.sync(); await syncB.sync();
    expect((await b.createBackup()).data.runs![0].distanceKm).toBe(9);
    expect((await b.createBackup()).recovery!.conflicts).toHaveLength(1);
    expect(server.changes.at(-1)?.data).toBeNull();
  });
  it('does not apply a late response after account scope is stopped', async () => {
    const a = device(); const server = new Server();
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const coordinator = new SyncCoordinator(a, { push: (op) => server.push(op), async pull(cursor) { await gate; return server.pull(cursor); } });
    const cycle = coordinator.sync();
    coordinator.stop(); release!(); await cycle;
    expect(await a.getCursor()).toBe(0);
  });
});

it('leaves durable work pending when another tab holds the account sync lock', async () => {
  const repository = device();
  await repository.createRun({ date: 1, distanceKm: 5, durationSeconds: 1500 });
  const push = vi.fn(); const pull = vi.fn();
  vi.stubGlobal('navigator', { locks: {
    request: async (_name: string, _options: unknown, callback: (lock: Lock | null) => Promise<void>) => callback(null),
  } });
  await new SyncCoordinator(repository, { push, pull }, 'project/account').sync();
  expect(push).not.toHaveBeenCalled(); expect(pull).not.toHaveBeenCalled();
  expect(await repository.nextOperation(Date.now())).toBeDefined();
});

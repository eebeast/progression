import Dexie, { liveQuery, type Table } from 'dexie';
import { canonicalJson, recordStores } from '@/storage/reconciliation';
import { dependsOn, dependencyKeys } from '@/storage/sync/dependencies';
import type { SyncStore, Operation, Mutation, RemoteRecord, PushResult, PullResult, SyncRepository, SyncStatus, SyncConflict } from '@/storage/sync/types';

type QueuedOperation = Operation & { queueId?: number };
type Version = RemoteRecord & { key: string };
const recordKey = (store: string, id: string) => `${store}/${id}`;
import type {
  BodyWeightEntry,
  Exercise,
  ExerciseLog,
  Run,
  Settings,
  TemplateExercise,
  WorkoutSession,
  WorkoutTemplate,
} from '@/types';
import { newId } from '@/utils/format';
import { DEFAULT_SETTINGS, PROGRAM } from '@/storage/defaults';
import { configuredCategory, EXERCISE_CATEGORIES } from '@/utils/muscleGroups';
import { exerciseHistoryIds, reusableExercise } from '@/utils/exerciseHistory';
import type {
  LastPerformed,
  ImportOptions,
  ImportResult,
  NewBodyWeightInput,
  NewRunInput,
  NewSetInput,
  Observable,
  SessionMeta,
  TemplateInput,
  WorkoutRepository,
} from '@/storage/repository';
import {
  inspectLegacyBackup,
  parseLegacyBackup,
  type BackupShape,
} from '@/storage/legacyBackup';

/* ------------------------------- Schema ------------------------------- */

class WorkoutDB extends Dexie {
  outbox!: Table<QueuedOperation, number>;
  versions!: Table<Version, string>;
  syncMeta!: Table<{ id: string; value: number }, string>;
  syncConflicts!: Table<SyncConflict, string>;
  settings!: Table<Settings, string>;
  exercises!: Table<Exercise, string>;
  templates!: Table<WorkoutTemplate, string>;
  sessions!: Table<WorkoutSession, string>;
  logs!: Table<ExerciseLog, string>;
  runs!: Table<Run, string>;
  bodyWeights!: Table<BodyWeightEntry, string>;

  constructor(name = 'workout-tracker') {
    super(name);
    this.version(1).stores({
      settings: 'id',
      exercises: 'id, name',
      templates: 'id, order',
      sessions: 'id, date, status, templateId',
      logs: 'id, sessionId, exerciseId, [sessionId+exerciseId], timestamp',
    });
    // v2: add manual run logging. Existing stores carry over unchanged.
    this.version(2).stores({
      runs: 'id, date, createdAt',
    });
    // v3: add a body-weight log. Existing stores carry over unchanged.
    this.version(3).stores({
      bodyWeights: 'id, date',
    });
    this.version(4).stores({
      outbox: '++queueId, &id',
      versions: 'key',
      syncMeta: 'id',
      syncConflicts: 'id',
    });
    // v5: promote catalogued shoulder-isolation movements out of the old Arms/Back buckets.
    this.version(5).stores({}).upgrade(async (transaction) => {
      await transaction.table('exercises').toCollection().modify((exercise: Exercise) => {
        if ((exercise.category === 'Arms' || exercise.category === 'Back') && configuredCategory(exercise.name) === 'Shoulder') {
          exercise.category = 'Shoulder';
        }
      });
    });
  }
}

/**
 * The Dexie/IndexedDB implementation of WorkoutRepository. This is the ONLY file
 * that imports `dexie`. Reactive reads use `liveQuery(...)` (a compatible
 * Observable); writes reuse the original query logic.
 */
export class DexieRepository implements WorkoutRepository, SyncRepository {
  private db: WorkoutDB;

  constructor(databaseName = 'workout-tracker', private accountIdentity?: string) {
    this.db = new WorkoutDB(databaseName);
  }

  close(): void {
    this.db.close();
  }

  private async snapshot(): Promise<Map<string, { store: SyncStore; id: string; data: Record<string, unknown> }>> {
    const result = new Map<string, { store: SyncStore; id: string; data: Record<string, unknown> }>();
    for (const store of recordStores) {
      const rows = await this.db.table(store).toArray() as Record<string, unknown>[];
      for (const row of rows) {
        const id = String(row.id);
        // Template rotation has its own revisioned aggregate.
        const data = { ...row };
        if (store === 'templates') delete data.order;
        result.set(recordKey(store, id), { store, id, data });
      }
    }
    const templates = await this.db.templates.filter((template) => !template.archivedAt).toArray();
    result.set('programOrder/singleton', { store: 'programOrder', id: 'singleton', data: {
      id: 'singleton', orderedIds: templates.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)).map((row) => row.id),
    } });
    return result;
  }

  /** All account mutations, including multi-record actions, commit with their outbox group. */
  private async mutate<T>(action: () => Promise<T>, batchImport = false): Promise<T> {
    if (Dexie.currentTransaction?.db === this.db) return action();
    return this.db.transaction('rw', this.db.tables, async () => {
      if (!this.accountIdentity) return action();
      const before = await this.snapshot();
      const result = await action();
      const after = await this.snapshot();
      const pending = await this.db.outbox.toArray();
      const mutations: Mutation[] = [];
      for (const key of new Set([...before.keys(), ...after.keys()])) {
        if (canonicalJson(before.get(key)?.data) === canonicalJson(after.get(key)?.data)) continue;
        const row = after.get(key) ?? before.get(key)!;
        const accepted = await this.db.versions.get(key);
        const preceding = pending.filter((op) => op.mutations.some((m) => recordKey(m.store, m.id) === key)).length;
        mutations.push({ store: row.store, id: row.id, data: after.get(key)?.data ?? null,
          baseVersion: (accepted?.version ?? 0) + preceding });
      }
      await this.enqueue(mutations, batchImport);
      return result;
    });
  }

  private async enqueue(mutations: Mutation[], batch = false): Promise<void> {
    const order = ['settings', 'exercises', 'templates', 'sessions', 'logs', 'runs', 'bodyWeights', 'programOrder'];
    if (batch) mutations.sort((a, b) => order.indexOf(a.store) - order.indexOf(b.store));
    const chunks: Mutation[][] = []; let chunk: Mutation[] = [];
    for (const mutation of mutations) {
      const next = [...chunk, mutation];
      if (next.length > 400 || new TextEncoder().encode(JSON.stringify(next)).length > 1_000_000) {
        if (!batch || !chunk.length) throw new Error('This atomic change is too large to sync. Split it into smaller changes.');
        chunks.push(chunk); chunk = [];
      }
      chunk.push(mutation);
      if (new TextEncoder().encode(JSON.stringify(chunk)).length > 1_000_000) throw new Error('An individual record is too large to sync.');
    }
    if (chunk.length) chunks.push(chunk);
    for (const group of chunks) await this.db.outbox.add({ id: newId(), mutations: group, createdAt: Date.now(), attempts: 0, nextAttemptAt: 0 });
  }

  observeSyncStatus(): Observable<SyncStatus> {
    return liveQuery(async () => {
      const pending = await this.db.outbox.toArray();
      return { pending: pending.length, conflicts: await this.db.syncConflicts.count(),
        lastSyncedAt: (await this.db.syncMeta.get('lastSyncedAt'))?.value,
        error: pending.find((op) => op.error)?.error };
    });
  }

  observeConflicts(): Observable<SyncConflict[]> { return liveQuery(() => this.db.syncConflicts.toArray()); }

  async nextOperation(now: number): Promise<Operation | undefined> {
    const queue = await this.db.outbox.toArray();
    return queue.find((op, index) => !op.blocked && op.nextAttemptAt <= now &&
      !queue.slice(0, index).some((prior) => dependsOn(op, prior)));
  }

  private async applyRecord(record: RemoteRecord): Promise<void> {
    if (record.store === 'programOrder') {
      const ids = record.data?.orderedIds as string[] | undefined;
      if (ids) for (const [order, id] of ids.entries()) await this.db.templates.update(id, { order });
      return;
    }
    const table = this.db.table(record.store);
    if (record.data === null) await table.delete(record.id);
    else {
      const data = { ...record.data };
      if (record.store === 'templates') {
        const ids = (await this.db.versions.get('programOrder/singleton'))?.data?.orderedIds as string[] | undefined;
        const index = ids?.indexOf(record.id) ?? -1;
        data.order = index >= 0 ? index : (await this.db.templates.get(record.id))?.order ?? 0;
      }
      await table.put(data);
    }
  }

  async acknowledge(operation: Operation, result: PushResult): Promise<void> {
    await this.db.transaction('rw', this.db.tables, async () => {
      const queued = await this.db.outbox.where('id').equals(operation.id).first();
      if (!queued) return; // Another tab already applied this receipt.
      if (result.status !== 'accepted') {
        await this.db.outbox.update(queued.queueId!, { blocked: true, error: result.error ?? 'Competing edit requires review' });
        for (const row of result.records) {
          const key = recordKey(row.store, row.id);
          if (((await this.db.versions.get(key))?.version ?? 0) <= row.version) await this.db.versions.put({ ...row, key });
        }
        await this.db.syncConflicts.put({ id: operation.id, operation, records: result.records, error: result.error });
        return;
      }
      await this.db.outbox.delete(queued.queueId!);
      const pending = await this.db.outbox.toArray();
      for (const row of result.records) {
        const key = recordKey(row.store, row.id);
        const current = await this.db.versions.get(key);
        if ((current?.version ?? 0) > row.version) continue;
        await this.db.versions.put({ ...row, key });
        if (!pending.some((op) => dependencyKeys(op).has(key))) await this.applyRecord(row);
      }
      // Pulls may have retained an older parent to keep pending child edits accessible.
      // Once that intent is acknowledged, expose the latest accepted parent too.
      for (const key of dependencyKeys(operation)) {
        if (pending.some((op) => dependencyKeys(op).has(key))) continue;
        const accepted = await this.db.versions.get(key);
        if (accepted) await this.applyRecord(accepted);
      }
    });
  }

  async deferOperation(operation: Operation, error: string, nextAttemptAt: number): Promise<void> {
    await this.db.outbox.where('id').equals(operation.id).modify({ attempts: operation.attempts + 1, error, nextAttemptAt });
  }

  async retrySync(): Promise<void> {
    await this.db.outbox.filter((operation) => !operation.blocked).modify({ nextAttemptAt: 0, error: undefined });
  }

  async getCursor(): Promise<number> { return (await this.db.syncMeta.get('cursor'))?.value ?? 0; }

  async applyChanges(page: PullResult): Promise<void> {
    await this.db.transaction('rw', this.db.tables, async () => {
      const cursor = await this.getCursor();
      if (page.cursor < cursor) return;
      const pending = await this.db.outbox.toArray();
      for (const row of page.changes) {
        const key = recordKey(row.store, row.id);
        const current = await this.db.versions.get(key);
        if ((current?.version ?? 0) > row.version) continue;
        await this.db.versions.put({ ...row, key });
        if (!pending.some((op) => dependencyKeys(op).has(key))) await this.applyRecord(row);
      }
      await this.db.syncMeta.put({ id: 'cursor', value: page.cursor });
    });
  }

  async markSynced(): Promise<void> { await this.db.syncMeta.put({ id: 'lastSyncedAt', value: Date.now() }); }

  async resolveConflict(id: string, choice: 'local' | 'remote'): Promise<void> {
    await this.db.transaction('rw', this.db.tables, async () => {
      const conflict = await this.db.syncConflicts.get(id);
      if (!conflict) return;
      if (!this.accountIdentity) {
        if (choice === 'remote') for (const row of conflict.records) await this.applyRecord(row);
        await this.db.syncConflicts.delete(id);
        return;
      }
      const queue = await this.db.outbox.toArray();
      const linked = new Set<string>([id]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const op of queue) if (!linked.has(op.id) && queue.some((prior) => linked.has(prior.id) && dependsOn(op, prior))) {
          linked.add(op.id); changed = true;
        }
      }
      const selected = queue.filter((op) => linked.has(op.id));
      const originals = selected.flatMap((op) => op.mutations);
      const affected = new Set(originals.map((m) => recordKey(m.store, m.id)));
      const snapshot = await this.snapshot();
      // A rejected child must keep its locally known parent available for explicit restoration.
      for (const op of selected) for (const key of dependencyKeys(op)) {
        const accepted = await this.db.versions.get(key);
        if (accepted?.data === null && snapshot.has(key)) affected.add(key);
      }
      const mutations: Mutation[] = [];
      for (const key of affected) {
        const accepted = await this.db.versions.get(key); const row = snapshot.get(key);
        const original = originals.find((m) => recordKey(m.store, m.id) === key) ?? accepted ?? row;
        if (!original) continue;
        if (choice === 'remote') await this.applyRecord(accepted ?? { store: original.store, id: original.id, version: 0, data: null });
        else if (canonicalJson(row?.data ?? null) !== canonicalJson(accepted?.data ?? null)) {
          mutations.push({ store: original.store, id: original.id, data: row?.data ?? null, baseVersion: accepted?.version ?? 0 });
        }
      }
      for (const operationId of linked) {
        await this.db.outbox.where('id').equals(operationId).delete(); await this.db.syncConflicts.delete(operationId);
      }
      await this.enqueue(mutations, true);
    });
  }

  /* ----------------------------- settings ----------------------------- */

  observeSettings(): Observable<Settings | undefined> {
    return liveQuery(() => this.db.settings.get('singleton'));
  }

  async updateSettings(patch: Partial<Settings>): Promise<void> {
    return this.mutate(async () => {
      await this.db.settings.update('singleton', patch);
    });
  }

  /** Idempotent: seeds empty tables and repairs legacy settings rows. */
  async ensureSeeded(): Promise<void> {
    if (this.accountIdentity) {
      // Cloud accounts bootstrap from remote history; never generate per-device plans.
      await this.db.transaction('rw', this.db.settings, async () => {
        if (!(await this.db.settings.get('singleton'))) await this.db.settings.put(DEFAULT_SETTINGS);
      });
      return;
    }
    return this.mutate(async () => {
      await this.db.transaction('rw', this.db.settings, this.db.exercises, this.db.templates, async () => {
        if ((await this.db.settings.count()) === 0) {
          await this.db.settings.put(DEFAULT_SETTINGS);
        } else {
          // Repair rows saved before a field existed (or that stored NaN/undefined).
          const s = await this.db.settings.get('singleton');
          if (s) {
            const fix: Partial<Settings> = {};
            if (typeof s.weeklyGoal !== 'number' || !Number.isFinite(s.weeklyGoal))
              fix.weeklyGoal = DEFAULT_SETTINGS.weeklyGoal;
            if (typeof s.weightIncrement !== 'number' || !Number.isFinite(s.weightIncrement))
              fix.weightIncrement = DEFAULT_SETTINGS.weightIncrement;
            if (!s.accent) fix.accent = DEFAULT_SETTINGS.accent;
            if (!s.unit) fix.unit = DEFAULT_SETTINGS.unit;
            if (!s.theme) fix.theme = DEFAULT_SETTINGS.theme;
            if (Object.keys(fix).length) await this.db.settings.update('singleton', fix);
          }
        }

        if (!this.accountIdentity && (await this.db.templates.count()) === 0) {
          const exerciseLibrary = await this.db.exercises.toArray();
          const ensureExercise = (name: string): Exercise => {
            let ex = reusableExercise(exerciseLibrary, name);
            if (!ex) {
              ex = { id: newId(), name, category: configuredCategory(name), createdAt: Date.now() };
              exerciseLibrary.push(ex);
            }
            return ex;
          };

          const templates: WorkoutTemplate[] = PROGRAM.map((day, dayIndex) => {
            const exercises: TemplateExercise[] = day.exercises.map((e, i) => {
              const ex = ensureExercise(e.name);
              return {
                exerciseId: ex.id,
                name: ex.name,
                targetSets: e.targetSets,
                targetRepRange: e.targetRepRange,
                order: i,
              };
            });
            const now = Date.now();
            return {
              id: newId(),
              name: day.name,
              order: dayIndex,
              estimatedMinutes: day.estimatedMinutes,
              exercises,
              createdAt: now,
              updatedAt: now,
            };
          });

          await this.db.exercises.bulkPut(exerciseLibrary);
          await this.db.templates.bulkPut(templates);
        }
    });
    });
  }

  /* ----------------------------- exercises ----------------------------- */

  listExercises(): Promise<Exercise[]> {
    return this.db.exercises.toArray();
  }

  async bulkCreateExercises(list: Exercise[]): Promise<void> {
    return this.mutate(async () => {
      if (list.length) await this.db.exercises.bulkPut(list);
    });
  }

  observeExercises(): Observable<Exercise[]> {
    return liveQuery(() => this.db.exercises.toArray());
  }

  async createExercise(input: Pick<Exercise, 'name' | 'category' | 'primaryMuscle' | 'equipment' | 'separateHistory'>): Promise<string> {
    return this.mutate(async () => {
      if (!input.name.trim()) throw new Error('An exercise needs a name.');
      if (input.category && !EXERCISE_CATEGORIES.includes(input.category)) throw new Error('Choose a valid exercise category.');
      const id = newId();
      await this.db.exercises.add({ ...input, name: input.name.trim(), id, createdAt: Date.now() });
      return id;
    });
  }

  async updateExercise(id: string, patch: Partial<Pick<Exercise, 'name' | 'category' | 'primaryMuscle' | 'equipment' | 'separateHistory' | 'archivedAt'>>): Promise<void> {
    return this.mutate(async () => {
      const exercise = await this.db.exercises.get(id);
      if (!exercise) throw new Error('Exercise not found.');
      if (patch.name !== undefined && !patch.name.trim()) throw new Error('An exercise needs a name.');
      if (patch.category && !EXERCISE_CATEGORIES.includes(patch.category)) throw new Error('Choose a valid exercise category.');
      const next = { ...exercise, ...patch, name: patch.name?.trim() ?? exercise.name };
      await this.db.exercises.put(next);
      // Future plan displays follow the canonical name; session/log snapshots do not.
      if (next.name !== exercise.name) await this.db.templates.toCollection().modify((template) => {
        template.exercises = template.exercises.map((row) => row.exerciseId === id ? { ...row, name: next.name } : row);
      });
    });
  }

  async previewExerciseMerge(sourceId: string, targetId: string) {
    if (sourceId === targetId) throw new Error('Choose two different exercises.');
    const [source, target] = await this.db.exercises.bulkGet([sourceId, targetId]);
    if (!source || !target || target.archivedAt || source.merge) throw new Error('Choose an existing source and active target.');
    return {
      templates: await this.db.templates.filter((row) => row.exercises.some((e) => e.exerciseId === sourceId)).count(),
      sessions: await this.db.sessions.filter((row) => !!row.exercises?.some((e) => e.exerciseId === sourceId)).count(),
      sets: await this.db.logs.where('exerciseId').equals(sourceId).count(),
    };
  }

  async mergeExercises(sourceId: string, targetId: string): Promise<void> {
    return this.mutate(async () => {
      await this.previewExerciseMerge(sourceId, targetId);
      const target = (await this.db.exercises.get(targetId))!;
      await this.db.templates.toCollection().modify((row) => {
        row.exercises = row.exercises.map((e) => e.exerciseId === sourceId ? { ...e, exerciseId: targetId, name: target.name } : e);
      });
      await this.db.sessions.toCollection().modify((row) => {
        if (row.exercises) row.exercises = row.exercises.map((e) => e.exerciseId === sourceId ? { ...e, exerciseId: targetId } : e);
      });
      await this.db.logs.where('exerciseId').equals(sourceId).modify({ exerciseId: targetId });
      const timestamp = Date.now();
      await this.db.exercises.update(sourceId, { archivedAt: timestamp, merge: { targetId, timestamp } });
    });
  }

  /* ----------------------------- templates ----------------------------- */

  async installFourDayPlan(): Promise<void> {
    await this.mutate(async () => {
      const now = Date.now();
      const templates = await this.db.templates.toArray();
      for (const template of templates) await this.db.templates.update(template.id, { archivedAt: now });
      const library = await this.db.exercises.toArray();
      for (const [order, day] of PROGRAM.entries()) {
        const prior = templates.find((template) => template.presetDay === order);
        const exercises: TemplateExercise[] = [];
        for (const [position, assignment] of day.exercises.entries()) {
          // Reuse a verified alias family. Distinct/ambiguous movements remain untouched.
          const priorId = prior?.exercises.find((row) => row.name === assignment.name)?.exerciseId;
          let exercise = library.find((row) => row.id === priorId && !row.archivedAt) ?? reusableExercise(library, assignment.name);
          if (!exercise) {
            exercise = { id: newId(), name: assignment.name, category: configuredCategory(assignment.name), createdAt: now };
            library.push(exercise); await this.db.exercises.add(exercise);
          }
          exercises.push({ exerciseId: exercise.id, assignmentId: newId(), name: assignment.name,
            targetSets: assignment.targetSets, targetRepRange: assignment.targetRepRange, order: position });
        }
        await this.db.templates.put({ id: prior?.id ?? newId(), name: day.name, order, estimatedMinutes: day.estimatedMinutes,
          exercises, presetDay: order, createdAt: prior?.createdAt ?? now, updatedAt: now });
      }
    });
  }

  observeTemplates(includeArchived = false): Observable<WorkoutTemplate[]> {
    return liveQuery(async () => {
      const templates = await this.db.templates.filter((template) => includeArchived || !template.archivedAt).toArray();
      return templates.sort((a, b) => a.order - b.order);
    });
  }

  getTemplate(id: string): Promise<WorkoutTemplate | undefined> {
    return this.db.templates.get(id);
  }

  observeTemplate(id: string): Observable<WorkoutTemplate | undefined> {
    return liveQuery(() => this.db.templates.get(id));
  }

  async createTemplate(input: TemplateInput): Promise<string> {
    return this.mutate(async () => {
      const count = await this.db.templates.count();
      const now = Date.now();
      const template: WorkoutTemplate = {
        id: newId(),
        name: input.name,
        order: count,
        estimatedMinutes: input.estimatedMinutes,
        exercises: input.exercises,
        createdAt: now,
        updatedAt: now,
      };
      await this.db.templates.put(template);
      return template.id;
    });
  }

  async updateTemplate(id: string, patch: TemplateInput): Promise<void> {
    return this.mutate(async () => {
      const existing = await this.db.templates.get(id);
      if (!existing) return;
      await this.db.templates.put({
        ...existing,
        name: patch.name,
        estimatedMinutes: patch.estimatedMinutes,
        exercises: patch.exercises,
        updatedAt: Date.now(),
    });
    });
  }

  async deleteTemplate(id: string): Promise<void> {
    return this.mutate(async () => {
      await this.db.templates.delete(id);
    });
  }

  async reorderTemplates(orderedIds: string[]): Promise<void> {
    return this.mutate(async () => {
      await this.db.transaction('rw', this.db.templates, async () => {
        await Promise.all(orderedIds.map((id, i) => this.db.templates.update(id, { order: i })));
    });
    });
  }

  /* ----------------------------- sessions ----------------------------- */

  private async activeSession(): Promise<WorkoutSession | null> {
    const active = await this.db.sessions.where('status').equals('active').toArray();
    // Newest active session, if somehow more than one exists.
    active.sort((a, b) => b.startTime - a.startTime);
    return active[0] ?? null;
  }

  observeActiveSession(): Observable<WorkoutSession | null> {
    return liveQuery(() => this.activeSession());
  }

  getActiveSession(): Promise<WorkoutSession | null> {
    return this.activeSession();
  }

  async getLastCompletedSession(): Promise<WorkoutSession | null> {
    const completed = await this.db.sessions
      .where('status')
      .equals('completed')
      .reverse()
      .sortBy('date');
    return completed[0] ?? null;
  }

  observeCompletedSessions(): Observable<WorkoutSession[]> {
    return liveQuery(async () => {
      const sessions = await this.db.sessions.where('status').equals('completed').toArray();
      return sessions.sort((a, b) => b.date - a.date);
    });
  }

  observeSession(id: string): Observable<WorkoutSession | undefined> {
    return liveQuery(() => this.db.sessions.get(id));
  }

  async startSession(template: WorkoutTemplate): Promise<string> {
    return this.mutate(async () => {
      const now = Date.now();
      const session: WorkoutSession = {
        id: newId(),
        templateId: template.id,
        templateName: template.name,
        exercises: structuredClone(template.exercises).map((row) => ({ ...row, assignmentId: row.assignmentId ?? newId() })),
        date: now,
        startTime: now,
        endTime: null,
        notes: '',
        feeling: null,
        status: 'active',
      };
      await this.db.sessions.put(session);
      return session.id;
    });
  }

  /** Freeze the clock the moment we land on the summary. */
  async endSessionClock(id: string): Promise<void> {
    return this.mutate(async () => {
      const session = await this.db.sessions.get(id);
      if (session && session.endTime == null) {
        await this.db.sessions.update(id, { endTime: Date.now() });
      }
    });
  }

  async finishSession(id: string, meta: SessionMeta): Promise<void> {
    return this.mutate(async () => {
      const session = await this.db.sessions.get(id);
      await this.db.sessions.update(id, {
        status: 'completed',
        endTime: session?.endTime ?? Date.now(),
        notes: meta.notes,
        feeling: meta.feeling,
    });
    });
  }

  async discardSession(id: string): Promise<void> {
    return this.mutate(async () => {
      await this.db.transaction('rw', this.db.sessions, this.db.logs, async () => {
        await this.db.logs.where('sessionId').equals(id).delete();
        await this.db.sessions.delete(id);
    });
    });
  }

  async deleteSession(id: string): Promise<void> {
    return this.mutate(async () => {
      await this.discardSession(id);
    });
  }

  async addSessionExercise(id: string, exercise: TemplateExercise): Promise<void> {
    return this.mutate(async () => {
      const session = await this.db.sessions.get(id);
      const canonical = await this.db.exercises.get(exercise.exerciseId);
      if (!session || session.status !== 'active' || !canonical || canonical.archivedAt) throw new Error('Choose an active exercise and workout.');
      if (!session.exercises) throw new Error('This older workout has no preserved plan. Start a new workout to add exercises.');
      const assignments = [...session.exercises, { ...exercise, name: canonical.name, order: session.exercises.length, assignmentId: newId() }];
      await this.db.sessions.update(id, { exercises: assignments });
    });
  }

  async setRestTimer(id: string, endsAt: number | null): Promise<void> {
    return this.mutate(async () => {
      await this.db.sessions.update(id, { restEndsAt: endsAt });
    });
  }

  /* ------------------------------- logs ------------------------------- */

  observeSessionLogs(sessionId: string): Observable<ExerciseLog[]> {
    return liveQuery(async () => {
      const logs = await this.db.logs.where('sessionId').equals(sessionId).toArray();
      return logs.sort((a, b) => a.timestamp - b.timestamp);
    });
  }

  observeAllLogs(): Observable<ExerciseLog[]> { return liveQuery(() => this.db.logs.toArray()); }

  observeExerciseLogs(exerciseId: string): Observable<ExerciseLog[]> {
    return liveQuery(() => this.logsForExerciseHistory(exerciseId));
  }

  private async logsForExerciseHistory(exerciseId: string): Promise<ExerciseLog[]> {
    const [exercises, logs] = await Promise.all([this.db.exercises.toArray(), this.db.logs.toArray()]);
    const ids = new Set(exerciseHistoryIds(exercises, logs).get(exerciseId) ?? [exerciseId]);
    return logs.filter((log) => ids.has(log.exerciseId)).sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
  }

  private async logsForSessionExercise(
    sessionId: string,
    exerciseId: string,
    assignmentId?: string,
  ): Promise<ExerciseLog[]> {
    const logs = await this.db.logs
      .where('[sessionId+exerciseId]')
      .equals([sessionId, exerciseId])
      .toArray();
    return logs.filter((log) => log.assignmentId === assignmentId).sort((a, b) => a.setNumber - b.setNumber);
  }

  /**
   * Last workout: that exercise's sets from the most recent *other* session.
   * Returns null if this is the first time.
   */
  async getLastPerformedSets(
    exerciseId: string,
    currentSessionId: string,
  ): Promise<LastPerformed | null> {
    const logs = await this.logsForExerciseHistory(exerciseId);
    if (logs.length === 0) return null;

    const bySession = new Map<string, ExerciseLog[]>();
    for (const log of logs) {
      if (log.sessionId === currentSessionId) continue;
      const arr = bySession.get(log.sessionId) ?? [];
      arr.push(log);
      bySession.set(log.sessionId, arr);
    }
    if (bySession.size === 0) return null;

    const sessions = await this.db.sessions.bulkGet([...bySession.keys()]);
    const candidates = sessions.filter((s): s is WorkoutSession => !!s);
    if (candidates.length === 0) return null;

    candidates.sort((a, b) => b.date - a.date);
    const mostRecent = candidates[0];
    const sets = (bySession.get(mostRecent.id) ?? []).sort((a, b) => a.setNumber - b.setNumber);
    return { session: mostRecent, sets };
  }

  async addSet(input: NewSetInput): Promise<void> {
    return this.mutate(async () => {
      await this.db.transaction('rw', this.db.logs, async () => {
        const existing = await this.logsForSessionExercise(input.sessionId, input.exerciseId, input.assignmentId);
        const log: ExerciseLog = {
          id: newId(),
          sessionId: input.sessionId,
          exerciseId: input.exerciseId,
          exerciseName: input.exerciseName,
          assignmentId: input.assignmentId,
          setNumber: Math.max(0, ...existing.map((set) => set.setNumber)) + 1,
          weight: input.weight,
          reps: input.reps,
          metric: input.metric ?? 'reps',
          isWarmup: input.isWarmup ?? false,
          timestamp: Date.now(),
        };
        await this.db.logs.put(log);
    });
    });
  }

  async updateSet(
    id: string,
    data: Partial<Pick<ExerciseLog, 'weight' | 'reps' | 'isWarmup'>>,
  ): Promise<void> {
    return this.mutate(async () => {
      await this.db.logs.update(id, data);
    });
  }

  /** Delete a set and renumber the remaining sets for that session/exercise. */
  async deleteSet(id: string): Promise<void> {
    return this.mutate(async () => {
      await this.db.transaction('rw', this.db.logs, async () => {
        const log = await this.db.logs.get(id);
        if (!log) return;
        await this.db.logs.delete(id);
        const remaining = await this.logsForSessionExercise(log.sessionId, log.exerciseId, log.assignmentId);
        await Promise.all(
          remaining.map((l, i) =>
            l.setNumber === i + 1 ? Promise.resolve() : this.db.logs.update(l.id, { setNumber: i + 1 }),
          ),
        );
    });
    });
  }

  /** Persist a new set order by renumbering each set to its position (1-based). */
  async reorderSets(orderedIds: string[]): Promise<void> {
    return this.mutate(async () => {
      await this.db.transaction('rw', this.db.logs, async () => {
        await Promise.all(
          orderedIds.map((id, i) => this.db.logs.update(id, { setNumber: i + 1 })),
        );
    });
    });
  }

  /* ------------------------------- runs ------------------------------- */

  observeRuns(): Observable<Run[]> {
    return liveQuery(async () => {
      const runs = await this.db.runs.toArray();
      return runs.sort((a, b) => b.date - a.date || b.createdAt - a.createdAt);
    });
  }

  async createRun(input: NewRunInput): Promise<void> {
    return this.mutate(async () => {
      const run: Run = {
        id: newId(),
        date: input.date,
        distanceKm: input.distanceKm,
        durationSeconds: input.durationSeconds,
        notes: input.notes,
        feeling: input.feeling ?? null,
        createdAt: Date.now(),
      };
      await this.db.runs.put(run);
    });
  }

  async updateRun(
    id: string,
    patch: Partial<Pick<Run, 'date' | 'distanceKm' | 'durationSeconds' | 'notes' | 'feeling'>>,
  ): Promise<void> {
    return this.mutate(async () => {
      await this.db.runs.update(id, patch);
    });
  }

  async deleteRun(id: string): Promise<void> {
    return this.mutate(async () => {
      await this.db.runs.delete(id);
    });
  }

  /* --------------------------- body weight --------------------------- */

  observeBodyWeights(): Observable<BodyWeightEntry[]> {
    return liveQuery(async () => {
      const entries = await this.db.bodyWeights.toArray();
      return entries.sort((a, b) => b.date - a.date || b.createdAt - a.createdAt);
    });
  }

  async addBodyWeight(input: NewBodyWeightInput): Promise<void> {
    return this.mutate(async () => {
      const entry: BodyWeightEntry = {
        id: newId(),
        date: input.date,
        weight: input.weight,
        createdAt: Date.now(),
      };
      await this.db.bodyWeights.put(entry);
    });
  }

  async updateBodyWeight(
    id: string,
    patch: Partial<Pick<BodyWeightEntry, 'date' | 'weight'>>,
  ): Promise<void> {
    return this.mutate(async () => {
      await this.db.bodyWeights.update(id, patch);
    });
  }

  async deleteBodyWeight(id: string): Promise<void> {
    return this.mutate(async () => {
      await this.db.bodyWeights.delete(id);
    });
  }

  /* ------------------------------ backup ------------------------------ */

  async createBackup(): Promise<BackupShape> {
    return this.db.transaction('r', this.db.tables, async () => {
      const data = {} as BackupShape['data'];
      for (const store of recordStores) {
        // Store types share a record identity; the public shape remains strongly typed.
        Object.assign(data, { [store]: await this.db.table(store).toArray() });
      }
      return { app: 'workout-tracker', version: 2, exportedAt: Date.now(), data, recovery: {
        accountIdentity: this.accountIdentity,
        operations: await this.db.outbox.toArray(),
        versions: await this.db.versions.toArray(),
        metadata: await this.db.syncMeta.toArray(),
        conflicts: await this.db.syncConflicts.toArray(),
      } };
    });
  }

  async exportData(): Promise<void> {
    const backup = await this.createBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workout-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  inspectImport(file: File) {
    return inspectLegacyBackup(file);
  }

  /** Replaces ALL data. Caller is responsible for confirming first. */
  async importData(file: File, options?: ImportOptions): Promise<ImportResult> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      throw new Error('The selected file is not valid JSON.');
    }
    const { backup } = parseLegacyBackup(parsed);
    const { settings, exercises, templates, sessions, logs, runs, bodyWeights } = backup.data;
    // Account imports merge entity data through new operations, never transplant another outbox.
    if (this.accountIdentity && backup.recovery?.conflicts.length) {
      throw new Error('This recovery backup includes unresolved conflicts. Resolve them on the source account before a normal import.');
    }

    let skippedConflicts = 0;
    await this.mutate(() => this.db.transaction(
      'rw', this.db.tables,
      async () => {
        if (this.accountIdentity) {
          for (const store of recordStores) {
            if (store === 'settings' && options?.preferences !== 'source') continue; // Existing account preferences are chosen separately from history.
            for (const row of backup.data[store] ?? []) {
              const existing = await this.db.table(store).get(row.id);
              const accepted = options?.conflicts === 'skip' ? await this.db.versions.get(recordKey(store, row.id)) : undefined;
              if (accepted) {
                if (accepted.data === null || canonicalJson(accepted.data) !== canonicalJson(row)) skippedConflicts++;
                continue; // Preserve account edits and tombstones across automatic local merges.
              }
              const unclaimedSettings = store === 'settings' && !existing?.userName &&
                !(await this.db.versions.get('settings/singleton'));
              if (existing && !(store === 'settings' && options?.preferences === 'source') && !unclaimedSettings && canonicalJson(existing) !== canonicalJson(row)) {
                if (options?.conflicts === 'skip') { skippedConflicts++; continue; }
                throw new Error(`Import collision in ${store}: ${row.id}. Existing account data has not been replaced.`);
              }
              await this.db.table(store).put(row);
            }
          }
          return;
        }
        await Promise.all([
          this.db.settings.clear(),
          this.db.exercises.clear(),
          this.db.templates.clear(),
          this.db.sessions.clear(),
          this.db.logs.clear(),
          this.db.runs.clear(),
          this.db.bodyWeights.clear(),
        ]);
        if (settings?.length) await this.db.settings.bulkPut(settings);
        if (exercises?.length) await this.db.exercises.bulkPut(exercises);
        if (templates?.length) await this.db.templates.bulkPut(templates);
        if (sessions?.length) await this.db.sessions.bulkPut(sessions);
        if (logs?.length) await this.db.logs.bulkPut(logs);
        if (runs?.length) await this.db.runs.bulkPut(runs);
        if (bodyWeights?.length) await this.db.bodyWeights.bulkPut(bodyWeights);
        await this.db.outbox.clear(); await this.db.versions.clear();
        await this.db.syncMeta.clear(); await this.db.syncConflicts.clear();
        if (backup.recovery && (backup.recovery.operations.length || backup.recovery.conflicts.length)) {
          // Restore foreign intent for review, never as a transport queue for this device/account.
          const originals = [...backup.recovery.operations, ...backup.recovery.conflicts.map((c) => c.operation)];
          const intent = new Map(originals.flatMap((op) => op.mutations).map((m) => [recordKey(m.store, m.id), m]));
          const accepted = new Map<string, RemoteRecord>();
          for (const row of [...backup.recovery.versions, ...backup.recovery.conflicts.flatMap((c) => c.records)]) {
            const key = recordKey(row.store, row.id);
            if (!accepted.has(key) || accepted.get(key)!.version < row.version) accepted.set(key, row);
          }
          const id = newId();
          await this.db.syncConflicts.put({ id, operation: { id, mutations: [...intent.values()], createdAt: Date.now(), attempts: 0, nextAttemptAt: 0 },
            records: [...intent.keys()].map((key) => accepted.get(key) ?? { ...intent.get(key)!, data: null, version: 0 }),
            error: 'Recovered pending edits: current local values are preserved. Review the saved cloud versions before choosing.' });
        }
      },
    ), true);
    return { skippedConflicts };
  }
}

/** Default app-wide singleton. */
export const dexieRepository = new DexieRepository();

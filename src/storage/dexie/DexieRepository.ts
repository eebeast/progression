import Dexie, { liveQuery, type Table } from 'dexie';
import type {
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
import type {
  LastPerformed,
  NewRunInput,
  NewSetInput,
  Observable,
  SessionMeta,
  TemplateInput,
  WorkoutRepository,
} from '@/storage/repository';

/* ------------------------------- Schema ------------------------------- */

class WorkoutDB extends Dexie {
  settings!: Table<Settings, string>;
  exercises!: Table<Exercise, string>;
  templates!: Table<WorkoutTemplate, string>;
  sessions!: Table<WorkoutSession, string>;
  logs!: Table<ExerciseLog, string>;
  runs!: Table<Run, string>;

  constructor() {
    super('workout-tracker');
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
  }
}

interface BackupShape {
  app: 'workout-tracker';
  version: 1;
  exportedAt: number;
  data: {
    settings: Settings[];
    exercises: Exercise[];
    templates: WorkoutTemplate[];
    sessions: WorkoutSession[];
    logs: ExerciseLog[];
    runs?: Run[];
  };
}

/**
 * The Dexie/IndexedDB implementation of WorkoutRepository. This is the ONLY file
 * that imports `dexie`. Reactive reads use `liveQuery(...)` (a compatible
 * Observable); writes reuse the original query logic.
 */
export class DexieRepository implements WorkoutRepository {
  private db = new WorkoutDB();

  /* ----------------------------- settings ----------------------------- */

  observeSettings(): Observable<Settings | undefined> {
    return liveQuery(() => this.db.settings.get('singleton'));
  }

  async updateSettings(patch: Partial<Settings>): Promise<void> {
    await this.db.settings.update('singleton', patch);
  }

  /** Idempotent: seeds empty tables and repairs legacy settings rows. */
  async ensureSeeded(): Promise<void> {
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

      if ((await this.db.templates.count()) === 0) {
        const exerciseByName = new Map<string, Exercise>();
        const ensureExercise = (name: string): Exercise => {
          const key = name.toLowerCase();
          let ex = exerciseByName.get(key);
          if (!ex) {
            ex = { id: newId(), name, createdAt: Date.now() };
            exerciseByName.set(key, ex);
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

        if ((await this.db.exercises.count()) === 0) {
          await this.db.exercises.bulkPut([...exerciseByName.values()]);
        }
        await this.db.templates.bulkPut(templates);
      }
    });
  }

  /* ----------------------------- exercises ----------------------------- */

  listExercises(): Promise<Exercise[]> {
    return this.db.exercises.toArray();
  }

  async bulkCreateExercises(list: Exercise[]): Promise<void> {
    if (list.length) await this.db.exercises.bulkPut(list);
  }

  /* ----------------------------- templates ----------------------------- */

  observeTemplates(): Observable<WorkoutTemplate[]> {
    return liveQuery(async () => {
      const templates = await this.db.templates.toArray();
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
  }

  async updateTemplate(id: string, patch: TemplateInput): Promise<void> {
    const existing = await this.db.templates.get(id);
    if (!existing) return;
    await this.db.templates.put({
      ...existing,
      name: patch.name,
      estimatedMinutes: patch.estimatedMinutes,
      exercises: patch.exercises,
      updatedAt: Date.now(),
    });
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.db.templates.delete(id);
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
    const now = Date.now();
    const session: WorkoutSession = {
      id: newId(),
      templateId: template.id,
      templateName: template.name,
      date: now,
      startTime: now,
      endTime: null,
      notes: '',
      feeling: null,
      status: 'active',
    };
    await this.db.sessions.put(session);
    return session.id;
  }

  /** Freeze the clock the moment we land on the summary. */
  async endSessionClock(id: string): Promise<void> {
    const session = await this.db.sessions.get(id);
    if (session && session.endTime == null) {
      await this.db.sessions.update(id, { endTime: Date.now() });
    }
  }

  async finishSession(id: string, meta: SessionMeta): Promise<void> {
    const session = await this.db.sessions.get(id);
    await this.db.sessions.update(id, {
      status: 'completed',
      endTime: session?.endTime ?? Date.now(),
      notes: meta.notes,
      feeling: meta.feeling,
    });
  }

  async discardSession(id: string): Promise<void> {
    await this.db.transaction('rw', this.db.sessions, this.db.logs, async () => {
      await this.db.logs.where('sessionId').equals(id).delete();
      await this.db.sessions.delete(id);
    });
  }

  async deleteSession(id: string): Promise<void> {
    await this.discardSession(id);
  }

  /* ------------------------------- logs ------------------------------- */

  observeSessionLogs(sessionId: string): Observable<ExerciseLog[]> {
    return liveQuery(async () => {
      const logs = await this.db.logs.where('sessionId').equals(sessionId).toArray();
      return logs.sort((a, b) => a.timestamp - b.timestamp);
    });
  }

  private async logsForSessionExercise(
    sessionId: string,
    exerciseId: string,
  ): Promise<ExerciseLog[]> {
    const logs = await this.db.logs
      .where('[sessionId+exerciseId]')
      .equals([sessionId, exerciseId])
      .toArray();
    return logs.sort((a, b) => a.setNumber - b.setNumber);
  }

  /**
   * Last workout: that exercise's sets from the most recent *other* session.
   * Returns null if this is the first time.
   */
  async getLastPerformedSets(
    exerciseId: string,
    currentSessionId: string,
  ): Promise<LastPerformed | null> {
    const logs = await this.db.logs.where('exerciseId').equals(exerciseId).toArray();
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
    const existing = await this.logsForSessionExercise(input.sessionId, input.exerciseId);
    const log: ExerciseLog = {
      id: newId(),
      sessionId: input.sessionId,
      exerciseId: input.exerciseId,
      exerciseName: input.exerciseName,
      setNumber: existing.length + 1,
      weight: input.weight,
      reps: input.reps,
      timestamp: Date.now(),
    };
    await this.db.logs.put(log);
  }

  async updateSet(id: string, data: Partial<Pick<ExerciseLog, 'weight' | 'reps'>>): Promise<void> {
    await this.db.logs.update(id, data);
  }

  /** Delete a set and renumber the remaining sets for that session/exercise. */
  async deleteSet(id: string): Promise<void> {
    await this.db.transaction('rw', this.db.logs, async () => {
      const log = await this.db.logs.get(id);
      if (!log) return;
      await this.db.logs.delete(id);
      const remaining = await this.logsForSessionExercise(log.sessionId, log.exerciseId);
      await Promise.all(
        remaining.map((l, i) =>
          l.setNumber === i + 1 ? Promise.resolve() : this.db.logs.update(l.id, { setNumber: i + 1 }),
        ),
      );
    });
  }

  /** Persist a new set order by renumbering each set to its position (1-based). */
  async reorderSets(orderedIds: string[]): Promise<void> {
    await this.db.transaction('rw', this.db.logs, async () => {
      await Promise.all(
        orderedIds.map((id, i) => this.db.logs.update(id, { setNumber: i + 1 })),
      );
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
  }

  async updateRun(
    id: string,
    patch: Partial<Pick<Run, 'date' | 'distanceKm' | 'durationSeconds' | 'notes' | 'feeling'>>,
  ): Promise<void> {
    await this.db.runs.update(id, patch);
  }

  async deleteRun(id: string): Promise<void> {
    await this.db.runs.delete(id);
  }

  /* ------------------------------ backup ------------------------------ */

  async exportData(): Promise<void> {
    const [settings, exercises, templates, sessions, logs, runs] = await Promise.all([
      this.db.settings.toArray(),
      this.db.exercises.toArray(),
      this.db.templates.toArray(),
      this.db.sessions.toArray(),
      this.db.logs.toArray(),
      this.db.runs.toArray(),
    ]);

    const backup: BackupShape = {
      app: 'workout-tracker',
      version: 1,
      exportedAt: Date.now(),
      data: { settings, exercises, templates, sessions, logs, runs },
    };

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

  /** Replaces ALL data. Caller is responsible for confirming first. */
  async importData(file: File): Promise<void> {
    const text = await file.text();
    const parsed = JSON.parse(text) as Partial<BackupShape>;

    if (parsed.app !== 'workout-tracker' || !parsed.data) {
      throw new Error('This file is not a valid workout backup.');
    }

    const { settings, exercises, templates, sessions, logs, runs } = parsed.data;

    await this.db.transaction(
      'rw',
      [this.db.settings, this.db.exercises, this.db.templates, this.db.sessions, this.db.logs, this.db.runs],
      async () => {
        await Promise.all([
          this.db.settings.clear(),
          this.db.exercises.clear(),
          this.db.templates.clear(),
          this.db.sessions.clear(),
          this.db.logs.clear(),
          this.db.runs.clear(),
        ]);
        if (settings?.length) await this.db.settings.bulkPut(settings);
        if (exercises?.length) await this.db.exercises.bulkPut(exercises);
        if (templates?.length) await this.db.templates.bulkPut(templates);
        if (sessions?.length) await this.db.sessions.bulkPut(sessions);
        if (logs?.length) await this.db.logs.bulkPut(logs);
        if (runs?.length) await this.db.runs.bulkPut(runs);
      },
    );
  }
}

/** Default app-wide singleton. */
export const dexieRepository = new DexieRepository();

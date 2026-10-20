/**
 * NON-FUNCTIONAL skeleton — exists only to prove that a second backend drops in
 * behind `WorkoutRepository` without touching any page/component.
 *
 * A real implementation would back the reactive `observe*` reads with polling or
 * SSE/WebSocket subscriptions (each pushing fresh values into the returned
 * Observable's observer), and back every write (`updateSettings`, `addSet`,
 * `createRun`, …) with `fetch()` calls to a JSON API. Nothing here is wired up.
 */
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
import type {
  ImportOptions,
  ImportResult,
  LastPerformed,
  NewBodyWeightInput,
  NewRunInput,
  NewSetInput,
  Observable,
  SessionMeta,
  TemplateInput,
  WorkoutRepository,
} from '@/storage/repository';
import type { BackupImportReport } from '@/storage/legacyBackup';

const TODO = () => {
  throw new Error('not implemented');
};

export class HttpRepository implements WorkoutRepository {
  // settings
  observeSettings(): Observable<Settings | undefined> {
    return TODO();
  }
  updateSettings(_patch: Partial<Settings>): Promise<void> {
    return TODO();
  }
  ensureSeeded(): Promise<void> {
    return TODO();
  }

  // exercises
  listExercises(): Promise<Exercise[]> {
    return TODO();
  }
  bulkCreateExercises(_list: Exercise[]): Promise<void> {
    return TODO();
  }
  observeExercises(): Observable<Exercise[]> { return TODO(); }
  createExercise(_input: Pick<Exercise, 'name' | 'category' | 'primaryMuscle' | 'equipment'>): Promise<string> { return TODO(); }
  updateExercise(_id: string, _patch: Partial<Pick<Exercise, 'name' | 'category' | 'primaryMuscle' | 'equipment' | 'archivedAt'>>): Promise<void> { return TODO(); }
  previewExerciseMerge(_source: string, _target: string): Promise<{ templates: number; sessions: number; sets: number }> { return TODO(); }
  mergeExercises(_source: string, _target: string): Promise<void> { return TODO(); }

  // templates
  installFourDayPlan(): Promise<void> { return TODO(); }
  observeTemplates(_includeArchived?: boolean): Observable<WorkoutTemplate[]> {
    return TODO();
  }
  getTemplate(_id: string): Promise<WorkoutTemplate | undefined> {
    return TODO();
  }
  observeTemplate(_id: string): Observable<WorkoutTemplate | undefined> {
    return TODO();
  }
  createTemplate(_input: TemplateInput): Promise<string> {
    return TODO();
  }
  updateTemplate(_id: string, _patch: TemplateInput): Promise<void> {
    return TODO();
  }
  deleteTemplate(_id: string): Promise<void> {
    return TODO();
  }
  reorderTemplates(_orderedIds: string[]): Promise<void> {
    return TODO();
  }

  // sessions
  observeActiveSession(): Observable<WorkoutSession | null> {
    return TODO();
  }
  getActiveSession(): Promise<WorkoutSession | null> {
    return TODO();
  }
  getLastCompletedSession(): Promise<WorkoutSession | null> {
    return TODO();
  }
  observeCompletedSessions(): Observable<WorkoutSession[]> {
    return TODO();
  }
  observeSession(_id: string): Observable<WorkoutSession | undefined> {
    return TODO();
  }
  startSession(_template: WorkoutTemplate): Promise<string> {
    return TODO();
  }
  endSessionClock(_id: string): Promise<void> {
    return TODO();
  }
  finishSession(_id: string, _meta: SessionMeta): Promise<void> {
    return TODO();
  }
  discardSession(_id: string): Promise<void> {
    return TODO();
  }
  deleteSession(_id: string): Promise<void> {
    return TODO();
  }
  addSessionExercise(_id: string, _exercise: TemplateExercise): Promise<void> { return TODO(); }
  setRestTimer(_id: string, _endsAt: number | null): Promise<void> { return TODO(); }

  // logs
  observeSessionLogs(_sessionId: string): Observable<ExerciseLog[]> {
    return TODO();
  }
  observeAllLogs(): Observable<ExerciseLog[]> { return TODO(); }
  observeExerciseLogs(_exerciseId: string): Observable<ExerciseLog[]> {
    return TODO();
  }
  getLastPerformedSets(_exerciseId: string, _currentSessionId: string): Promise<LastPerformed | null> {
    return TODO();
  }
  addSet(_input: NewSetInput): Promise<void> {
    return TODO();
  }
  updateSet(_id: string, _data: Partial<Pick<ExerciseLog, 'weight' | 'reps' | 'isWarmup'>>): Promise<void> {
    return TODO();
  }
  deleteSet(_id: string): Promise<void> {
    return TODO();
  }
  reorderSets(_orderedIds: string[]): Promise<void> {
    return TODO();
  }

  // runs
  observeRuns(): Observable<Run[]> {
    return TODO();
  }
  createRun(_input: NewRunInput): Promise<void> {
    return TODO();
  }
  updateRun(
    _id: string,
    _patch: Partial<Pick<Run, 'date' | 'distanceKm' | 'durationSeconds' | 'notes' | 'feeling'>>,
  ): Promise<void> {
    return TODO();
  }
  deleteRun(_id: string): Promise<void> {
    return TODO();
  }

  // body weight
  observeBodyWeights(): Observable<BodyWeightEntry[]> {
    return TODO();
  }
  addBodyWeight(_input: NewBodyWeightInput): Promise<void> {
    return TODO();
  }
  updateBodyWeight(
    _id: string,
    _patch: Partial<Pick<BodyWeightEntry, 'date' | 'weight'>>,
  ): Promise<void> {
    return TODO();
  }
  deleteBodyWeight(_id: string): Promise<void> {
    return TODO();
  }

  // backup
  exportData(): Promise<void> {
    return TODO();
  }
  inspectImport(_file: File): Promise<BackupImportReport> {
    return TODO();
  }
  importData(_file: File, _options?: ImportOptions): Promise<ImportResult> {
    return TODO();
  }
}

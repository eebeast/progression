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
  Exercise,
  ExerciseLog,
  Run,
  Settings,
  WorkoutSession,
  WorkoutTemplate,
} from '@/types';
import type {
  LastPerformed,
  NewRunInput,
  NewSetInput,
  Observable,
  SessionMeta,
  TemplateInput,
  WorkoutRepository,
} from '@/storage/repository';

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

  // templates
  observeTemplates(): Observable<WorkoutTemplate[]> {
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

  // logs
  observeSessionLogs(_sessionId: string): Observable<ExerciseLog[]> {
    return TODO();
  }
  getLastPerformedSets(_exerciseId: string, _currentSessionId: string): Promise<LastPerformed | null> {
    return TODO();
  }
  addSet(_input: NewSetInput): Promise<void> {
    return TODO();
  }
  updateSet(_id: string, _data: Partial<Pick<ExerciseLog, 'weight' | 'reps'>>): Promise<void> {
    return TODO();
  }
  deleteSet(_id: string): Promise<void> {
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

  // backup
  exportData(): Promise<void> {
    return TODO();
  }
  importData(_file: File): Promise<void> {
    return TODO();
  }
}

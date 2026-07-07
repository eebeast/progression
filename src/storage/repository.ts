import type {
  BodyWeightEntry,
  Exercise,
  ExerciseLog,
  Feeling,
  Run,
  Settings,
  TemplateExercise,
  WorkoutSession,
  WorkoutTemplate,
} from '@/types';

/**
 * A minimal rxjs-style Observable so the storage seam has NO dependency on
 * Dexie (or any concrete backend). Dexie's `liveQuery(...)` returns a value that
 * is structurally compatible with this, and `useObservable` consumes it.
 */
export interface Subscription {
  unsubscribe(): void;
}

export interface Observer<T> {
  next: (value: T) => void;
  error?: (error: unknown) => void;
  complete?: () => void;
}

export interface Observable<T> {
  subscribe(observer: Observer<T>): Subscription;
}

/** A synchronous, single-value Observable — handy for "no subscription yet" cases. */
export function of<T>(value: T): Observable<T> {
  return {
    subscribe(observer: Observer<T>): Subscription {
      observer.next(value);
      return { unsubscribe() {} };
    },
  };
}

/* ------------------------------ Input shapes ------------------------------ */

export interface NewSetInput {
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  isWarmup?: boolean;
}

export interface NewRunInput {
  date: number;
  distanceKm: number;
  durationSeconds: number;
  notes?: string;
  feeling?: Feeling | null;
}

export interface NewBodyWeightInput {
  date: number;
  weight: number;
}

export interface TemplateInput {
  name: string;
  estimatedMinutes: number;
  exercises: TemplateExercise[];
}

export interface SessionMeta {
  notes: string;
  feeling: Feeling | null;
}

export interface LastPerformed {
  session: WorkoutSession;
  sets: ExerciseLog[];
}

/**
 * The single seam every page/component depends on. Writes return Promises;
 * reactive reads return a backend-neutral Observable. No SQL/Dexie concepts
 * leak past this interface.
 */
export interface WorkoutRepository {
  // settings
  observeSettings(): Observable<Settings | undefined>;
  updateSettings(patch: Partial<Settings>): Promise<void>;
  ensureSeeded(): Promise<void>;

  // exercises (global library)
  listExercises(): Promise<Exercise[]>;
  bulkCreateExercises(list: Exercise[]): Promise<void>;

  // templates
  observeTemplates(): Observable<WorkoutTemplate[]>;
  getTemplate(id: string): Promise<WorkoutTemplate | undefined>;
  observeTemplate(id: string): Observable<WorkoutTemplate | undefined>;
  createTemplate(input: TemplateInput): Promise<string>;
  updateTemplate(id: string, patch: TemplateInput): Promise<void>;
  deleteTemplate(id: string): Promise<void>;

  // sessions
  observeActiveSession(): Observable<WorkoutSession | null>;
  getActiveSession(): Promise<WorkoutSession | null>;
  getLastCompletedSession(): Promise<WorkoutSession | null>;
  observeCompletedSessions(): Observable<WorkoutSession[]>;
  observeSession(id: string): Observable<WorkoutSession | undefined>;
  startSession(template: WorkoutTemplate): Promise<string>;
  endSessionClock(id: string): Promise<void>;
  finishSession(id: string, meta: SessionMeta): Promise<void>;
  discardSession(id: string): Promise<void>;
  deleteSession(id: string): Promise<void>;

  // logs (sets)
  observeSessionLogs(sessionId: string): Observable<ExerciseLog[]>;
  /** Every logged set for an exercise, across all sessions, oldest first. */
  observeExerciseLogs(exerciseId: string): Observable<ExerciseLog[]>;
  getLastPerformedSets(
    exerciseId: string,
    currentSessionId: string,
  ): Promise<LastPerformed | null>;
  addSet(input: NewSetInput): Promise<void>;
  updateSet(id: string, data: Partial<Pick<ExerciseLog, 'weight' | 'reps' | 'isWarmup'>>): Promise<void>;
  deleteSet(id: string): Promise<void>;

  // runs
  observeRuns(): Observable<Run[]>;
  createRun(input: NewRunInput): Promise<void>;
  updateRun(
    id: string,
    patch: Partial<Pick<Run, 'date' | 'distanceKm' | 'durationSeconds' | 'notes' | 'feeling'>>,
  ): Promise<void>;
  deleteRun(id: string): Promise<void>;

  // body weight
  observeBodyWeights(): Observable<BodyWeightEntry[]>;
  addBodyWeight(input: NewBodyWeightInput): Promise<void>;
  updateBodyWeight(
    id: string,
    patch: Partial<Pick<BodyWeightEntry, 'date' | 'weight'>>,
  ): Promise<void>;
  deleteBodyWeight(id: string): Promise<void>;

  // backup
  exportData(): Promise<void>;
  importData(file: File): Promise<void>;
}

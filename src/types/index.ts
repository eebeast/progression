export type Unit = "kg" | "lb";
export type Theme = "light" | "dark" | "system";
export type Accent = "blue" | "purple" | "orange" | "green";
export type Feeling = "good" | "ok" | "rough";
export type SessionStatus = "active" | "completed";
/** How a set is measured: repetitions, or a hold/duration in seconds. */
export type Metric = "reps" | "time";
export type ExerciseCategory = 'Chest' | 'Legs' | 'Back' | 'Core' | 'Arms' | 'Compound';

export interface Settings {
  id: "singleton";
  userName: string;
  unit: Unit;
  theme: Theme;
  accent: Accent;
  weightIncrement: number;
  weeklyGoal: number;
  showExerciseLibrary?: boolean;
}

export interface Exercise {
  category?: ExerciseCategory;
  id: string;
  name: string;
  createdAt: number;
  primaryMuscle?: string;
  equipment?: string;
  archivedAt?: number;
  /** Explicit merge audit; the source definition is retained. */
  merge?: { targetId: string; timestamp: number };
}

export interface TemplateExercise {
  assignmentId?: string;
  restSeconds?: number;
  exerciseId: string;
  name: string;
  targetSets: number;
  targetRepRange: string; // reps or seconds range, interpreted per `metric`
  metric?: Metric; // defaults to 'reps' when absent (back-compat)
  order: number;
}

export interface WorkoutTemplate {
  archivedAt?: number;
  presetDay?: number;
  id: string;
  name: string;
  order: number;
  estimatedMinutes: number;
  exercises: TemplateExercise[];
  createdAt: number;
  updatedAt: number;
}

export interface WorkoutSession {
  id: string;
  templateId: string;
  templateName: string;
  /** Plan at start time; absent on legacy sessions. Never rebuilt on import. */
  exercises?: TemplateExercise[];
  restEndsAt?: number | null;
  date: number;
  startTime: number;
  endTime: number | null;
  notes: string;
  feeling: Feeling | null;
  status: SessionStatus;
}

export interface ExerciseLog {
  id: string;
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  assignmentId?: string;
  setNumber: number;
  weight: number;
  reps: number; // rep count, or duration in seconds when metric === 'time'
  metric?: Metric; // defaults to 'reps' when absent (back-compat)
  isWarmup?: boolean; // warm-up set; excluded from targets, progress, and PRs
  timestamp: number;
}

export interface Run {
  id: string;
  date: number; // the day of the run (local); user picks it, default today
  distanceKm: number;
  durationSeconds: number; // entered as minutes + seconds
  notes?: string;
  feeling?: Feeling | null;
  createdAt: number;
}

export interface BodyWeightEntry {
  id: string;
  date: number;
  weight: number; // stored in settings.unit active at entry time, like lifts
  createdAt: number;
}

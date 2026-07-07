export type Unit = 'kg' | 'lb';
export type Theme = 'light' | 'dark' | 'system';
export type Accent = 'blue' | 'purple' | 'orange' | 'green';
export type Feeling = 'good' | 'ok' | 'rough';
export type SessionStatus = 'active' | 'completed';

export interface Settings {
  id: 'singleton';
  userName: string;
  unit: Unit;
  theme: Theme;
  accent: Accent;
  weightIncrement: number;
  weeklyGoal: number; // target active days per week
}

export interface Exercise {
  id: string;
  name: string;
  createdAt: number;
}

export interface TemplateExercise {
  exerciseId: string;
  name: string;
  targetSets: number;
  targetRepRange: string;
  order: number;
}

export interface WorkoutTemplate {
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
  setNumber: number;
  weight: number;
  reps: number;
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

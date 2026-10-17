import type {
  BodyWeightEntry,
  Exercise,
  ExerciseLog,
  Run,
  Settings,
  WorkoutSession,
  WorkoutTemplate,
} from '@/types';
import type { RecoveryState } from '@/storage/sync/types';

export interface BackupShape {
  app: 'workout-tracker';
  version: 1 | 2;
  recovery?: RecoveryState;
  exportedAt: number;
  data: {
    settings: Settings[];
    exercises: Exercise[];
    templates: WorkoutTemplate[];
    sessions: WorkoutSession[];
    logs: ExerciseLog[];
    runs?: Run[];
    bodyWeights?: BodyWeightEntry[];
  };
}

export interface BackupImportReport {
  counts: {
    settings: number;
    exercises: number;
    templates: number;
    sessions: number;
    logs: number;
    runs: number;
    bodyWeights: number;
  };
  warnings: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function records(value: unknown, key: string, optional = false): Record<string, unknown>[] {
  if (optional && value === undefined) return [];
  if (!Array.isArray(value) || !value.every(isRecord)) {
    throw new Error(`Invalid workout backup: data.${key} must be an array of records.`);
  }
  return value;
}

function getUniqueIds(items: Record<string, unknown>[], key: string): Set<string> {
  const ids = new Set<string>();
  for (const item of items) {
    if (typeof item.id !== 'string' || !item.id.trim()) {
      throw new Error(`Invalid workout backup: every data.${key} record must have an id.`);
    }
    if (ids.has(item.id)) {
      throw new Error(`Invalid workout backup: duplicate id "${item.id}" in data.${key}.`);
    }
    ids.add(item.id);
  }
  return ids;
}

function validateTimestamps(items: Record<string, unknown>[], key: string, warnings: Set<string>) {
  for (const item of items) {
    for (const field of ['date', 'startTime', 'endTime', 'timestamp', 'createdAt', 'updatedAt']) {
      const value = item[field];
      if (value !== undefined && value !== null && (typeof value !== 'number' || !Number.isFinite(value))) {
        warnings.add(`Some ${key} records have a malformed ${field}; original values will be preserved.`);
      }
    }
  }
}

export function parseLegacyBackup(input: unknown): { backup: BackupShape; report: BackupImportReport } {
  if (!isRecord(input) || input.app !== 'workout-tracker' || ![1, 2].includes(input.version as number) || !isRecord(input.data)) {
    throw new Error('This file is not a supported workout backup (expected workout-tracker version 1).');
  }
  if (input.version === 2) {
    if (!isRecord(input.recovery) || !['operations', 'versions', 'metadata', 'conflicts'].every((key) => Array.isArray((input.recovery as Record<string, unknown>)[key]))) {
      throw new Error('This file is not a supported workout backup (missing version 2 recovery state).');
    }
  }
  if (typeof input.exportedAt !== 'number' || !Number.isFinite(input.exportedAt)) {
    throw new Error('Invalid workout backup: exportedAt must be a finite timestamp.');
  }

  const raw = input.data;
  const data = {
    settings: records(raw.settings, 'settings'),
    exercises: records(raw.exercises, 'exercises'),
    templates: records(raw.templates, 'templates'),
    sessions: records(raw.sessions, 'sessions'),
    logs: records(raw.logs, 'logs'),
    runs: records(raw.runs, 'runs', true),
    bodyWeights: records(raw.bodyWeights, 'bodyWeights', true),
  };

  const warnings = new Set<string>();
  const exerciseIds = getUniqueIds(data.exercises, 'exercises');
  const sessionIds = getUniqueIds(data.sessions, 'sessions');
  getUniqueIds(data.logs, 'logs');
  getUniqueIds(data.runs, 'runs');
  getUniqueIds(data.bodyWeights, 'bodyWeights');

  getUniqueIds(data.settings, 'settings');

  const names = new Map<string, string>();
  for (const exercise of data.exercises) {
    if (typeof exercise.name !== 'string') continue;
    const normalized = exercise.name.trim().toLowerCase();
    if (!normalized) continue;
    const prior = names.get(normalized);
    if (prior) {
      warnings.add(`Exercise names "${prior}" and "${exercise.name}" normalize to the same value; no records were merged.`);
    } else {
      names.set(normalized, exercise.name);
    }
  }

  for (const template of data.templates) {
    if (!Array.isArray(template.exercises)) continue;
    for (const assignment of template.exercises) {
      if (isRecord(assignment) && typeof assignment.exerciseId === 'string' && !exerciseIds.has(assignment.exerciseId)) {
        warnings.add(`Template "${String(template.id)}" references missing exercise "${assignment.exerciseId}".`);
      }
    }
  }

  const knownTemplateIds = getUniqueIds(data.templates, 'templates');
  for (const session of data.sessions) {
    if (
      typeof session.templateId === 'string' &&
      session.templateId &&
      !knownTemplateIds.has(session.templateId)
    ) {
      warnings.add(`Some sessions reference missing templates; the original records will be preserved.`);
    }
  }

  for (const log of data.logs) {
    if (typeof log.sessionId === 'string' && !sessionIds.has(log.sessionId)) {
      warnings.add(`Some set logs reference missing sessions; the original records will be preserved.`);
    }
    if (typeof log.exerciseId === 'string' && !exerciseIds.has(log.exerciseId)) {
      warnings.add(`Some set logs reference missing exercises; the original records will be preserved.`);
    }
  }

  validateTimestamps(data.exercises, 'exercise', warnings);
  validateTimestamps(data.templates, 'template', warnings);
  validateTimestamps(data.sessions, 'session', warnings);
  validateTimestamps(data.logs, 'set log', warnings);
  validateTimestamps(data.runs, 'run', warnings);
  validateTimestamps(data.bodyWeights, 'body-weight', warnings);
  if (data.runs.some((run) => run.distanceKm === undefined || run.durationSeconds === undefined)) {
    warnings.add('Some runs have missing distance or duration fields; original records will be preserved.');
  }

  const counts = {
    settings: data.settings.length,
    exercises: data.exercises.length,
    templates: data.templates.length,
    sessions: data.sessions.length,
    logs: data.logs.length,
    runs: data.runs.length,
    bodyWeights: data.bodyWeights.length,
  };

  return {
    backup: {
      app: 'workout-tracker',
      version: input.version as 1 | 2,
      ...(input.version === 2 ? { recovery: input.recovery as unknown as RecoveryState } : {}),
      exportedAt: input.exportedAt,
      // Keep legacy record payloads verbatim after validating their containers and IDs.
      data: data as unknown as BackupShape['data'],
    },
    report: { counts, warnings: [...warnings] },
  };
}

export async function inspectLegacyBackup(file: File): Promise<BackupImportReport> {
  let input: unknown;
  try {
    input = JSON.parse(await file.text());
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }
  return parseLegacyBackup(input).report;
}

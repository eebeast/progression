import { parseLegacyBackup, type BackupShape } from './legacyBackup';

export const recordStores = ['settings', 'exercises', 'templates', 'sessions', 'logs', 'runs', 'bodyWeights'] as const;
export type RecordStore = typeof recordStores[number];
export interface RecordDifference { store: RecordStore; id: string; kind: 'missing' | 'changed' | 'extra' }

/** Stable JSON comparison preserves every payload field and ignores object key order. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      return Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)));
    }
    return item;
  });
}

export function reconcileBackups(source: BackupShape, destination: BackupShape): RecordDifference[] {
  const differences: RecordDifference[] = [];
  for (const store of recordStores) {
    const expected = new Map((source.data[store] ?? []).map((row) => [row.id, row]));
    const actual = new Map((destination.data[store] ?? []).map((row) => [row.id, row]));
    for (const [id, row] of expected) {
      if (!actual.has(id)) differences.push({ store, id, kind: 'missing' });
      else if (canonicalJson(row) !== canonicalJson(actual.get(id))) differences.push({ store, id, kind: 'changed' });
    }
    for (const id of actual.keys()) if (!expected.has(id)) differences.push({ store, id, kind: 'extra' });
  }
  return differences;
}

/** Hash exact source bytes before parsing; never replace the user's original export. */
export async function inspectMigration(file: File) {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const checksum = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  const { backup, report } = parseLegacyBackup(JSON.parse(new TextDecoder().decode(bytes)));
  return { backup, report, checksum };
}

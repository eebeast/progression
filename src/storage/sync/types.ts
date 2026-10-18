import type { Observable } from '@/storage/repository';
import type { RecordStore } from '@/storage/reconciliation';

export type SyncStore = RecordStore | 'programOrder';
export interface Mutation {
  store: SyncStore;
  id: string;
  baseVersion: number;
  data: Record<string, unknown> | null;
}
export interface Operation {
  id: string;
  mutations: Mutation[];
  createdAt: number;
  attempts: number;
  nextAttemptAt: number;
  error?: string;
  blocked?: boolean;
}
export interface RemoteRecord {
  store: SyncStore;
  id: string;
  version: number;
  data: Record<string, unknown> | null;
}
export interface Change extends RemoteRecord { sequence: number }
export interface PushResult {
  status: 'accepted' | 'conflict' | 'rejected';
  records: RemoteRecord[];
  error?: string;
}
export interface SyncConflict { id: string; operation: Operation; records: RemoteRecord[]; error?: string }
export interface RecoveryState {
  accountIdentity?: string;
  operations: Operation[];
  versions: RemoteRecord[];
  metadata: { id: string; value: number }[];
  conflicts: SyncConflict[];
}
export interface PullResult { changes: Change[]; cursor: number; hasMore: boolean }
export interface SyncTransport {
  push(operation: Operation): Promise<PushResult>;
  pull(cursor: number): Promise<PullResult>;
}
export interface SyncStatus {
  pending: number;
  conflicts: number;
  lastSyncedAt?: number;
  error?: string;
}
export interface SyncRepository {
  observeSyncStatus(): Observable<SyncStatus>;
  nextOperation(now: number): Promise<Operation | undefined>;
  acknowledge(operation: Operation, result: PushResult): Promise<void>;
  deferOperation(operation: Operation, error: string, nextAttemptAt: number): Promise<void>;
  getCursor(): Promise<number>;
  applyChanges(page: PullResult): Promise<void>;
  markSynced(): Promise<void>;
}

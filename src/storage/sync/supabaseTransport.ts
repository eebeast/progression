import type { SupabaseClient } from '@supabase/supabase-js';
import type { Operation, PullResult, PushResult, SyncTransport } from './types';

export class SupabaseTransport implements SyncTransport {
  constructor(private client: SupabaseClient) {}
  async push(operation: Operation): Promise<PushResult> {
    const { data, error } = await this.client.rpc('sync_push', {
      operation_id: operation.id, mutations: operation.mutations,
    });
    if (error) {
      if (['22023', '23503', '23514'].includes(error.code)) return { status: 'rejected', records: [], error: error.message };
      throw new Error(error.message);
    }
    if (!data || !['accepted', 'conflict', 'rejected'].includes(data.status) || !Array.isArray(data.records)) {
      throw new Error('Unsupported sync response. Update the app before retrying.');
    }
    return data as PushResult;
  }
  async pull(cursor: number): Promise<PullResult> {
    const { data, error } = await this.client.rpc('sync_pull', { after_sequence: cursor, page_size: 200 });
    if (error) throw new Error(error.message);
    if (!data || !Array.isArray(data.changes) || !Number.isSafeInteger(data.cursor) || typeof data.hasMore !== 'boolean') {
      throw new Error('Invalid sync page; the local cursor has not advanced.');
    }
    return data as PullResult;
  }
}

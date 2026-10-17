import 'fake-indexeddb/auto';
import * as React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CloudProvider, useCloud } from './CloudProvider';
import { useRepo } from '@/storage/RepositoryProvider';
import { useObservable } from '@/hooks/useObservable';

const auth = vi.hoisted(() => ({ account: { id: 'a', email: 'a@example.test' } as { id: string; email: string } | null,
  callback: undefined as ((event: string, session: unknown) => void) | undefined,
  fail: false,
}));
vi.mock('./client', () => ({
  cloudProject: 'integration-test', completeOAuth: async () => {},
  cloudClient: {
    auth: {
      onAuthStateChange: (callback: typeof auth.callback) => { auth.callback = callback; return { data: { subscription: { unsubscribe() { auth.callback = undefined; } } } }; },
      getSession: async () => ({ data: { session: auth.account ? { user: auth.account } : null }, error: auth.fail ? new Error('Offline') : null }),
      signOut: async () => { auth.account = null; auth.callback?.('SIGNED_OUT', null); return {}; },
    },
    rpc: async (method: string, args: { mutations?: { baseVersion: number }[] }) => ({ data: method === 'sync_pull'
      ? { changes: [], cursor: 0, hasMore: false }
      : { status: 'accepted', records: args.mutations?.map((m) => ({ ...m, version: m.baseVersion + 1 })) }, error: null }),
  },
}));
function Probe() {
  const cloud = useCloud()!; const repo = useRepo();
  const rows = useObservable(() => repo.observeRuns(), [repo]);
  return <>
    <p>{cloud.account?.email ?? 'Local only'}</p><p>Runs: {rows?.length ?? 0}</p>
    <button onClick={() => repo.createRun({ date: 1, distanceKm: 1, durationSeconds: 300 })}>Add run</button>
    <button onClick={() => cloud.signOut()}>Sign out</button>
  </>;
}
beforeEach(() => {
  auth.account = { id: crypto.randomUUID(), email: 'a@example.test' }; auth.fail = false;
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key), clear: () => values.clear(),
  });
  localStorage.clear();
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('cloud account scope', () => {
  it('remounts repository reads when changing accounts and hides old records immediately', async () => {
    const user = userEvent.setup();
    render(<React.StrictMode><CloudProvider><Probe /></CloudProvider></React.StrictMode>);
    await screen.findByText('a@example.test');
    await user.click(screen.getByText('Add run'));
    await screen.findByText('Runs: 1');
    act(() => { auth.callback?.('SIGNED_IN', { user: { id: crypto.randomUUID(), email: 'b@example.test' } }); });
    await screen.findByText('b@example.test');
    expect(screen.queryByText('a@example.test')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Runs: 0')).toBeInTheDocument());
    await user.click(screen.getByText('Sign out'));
    await screen.findByText('Local only');
    expect(localStorage.getItem('progression:last-account:integration-test')).toBeNull();
  });
  it('retains the last authenticated account scope when network session refresh fails', async () => {
    localStorage.setItem('progression:last-account:integration-test', JSON.stringify(auth.account));
    auth.fail = true;
    render(<CloudProvider><Probe /></CloudProvider>);
    expect(await screen.findByText('a@example.test')).toBeInTheDocument();
  });
});

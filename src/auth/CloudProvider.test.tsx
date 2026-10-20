import 'fake-indexeddb/auto';
import * as React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CloudProvider, useCloud } from './CloudProvider';
import { useRepo } from '@/storage/RepositoryProvider';
import { dexieRepository } from '@/storage/dexie/DexieRepository';
import { useObservable } from '@/hooks/useObservable';

const auth = vi.hoisted(() => ({ account: { id: 'a', email: 'a@example.test' } as { id: string; email: string } | null,
  callback: undefined as ((event: string, session: unknown) => void) | undefined,
  fail: false, signOutFails: false,
}));
vi.mock('./client', () => ({
  cloudProject: 'integration-test', completeOAuth: async () => {},
  cloudClient: {
    auth: {
      onAuthStateChange: (callback: typeof auth.callback) => { auth.callback = callback; return { data: { subscription: { unsubscribe() { auth.callback = undefined; } } } }; },
      getSession: async () => ({ data: { session: auth.account ? { user: auth.account } : null }, error: auth.fail ? new Error('Offline') : null }),
      signOut: async () => { if (auth.signOutFails) throw new Error('Offline sign-out'); auth.account = null; auth.callback?.('SIGNED_OUT', null); return {}; },
    },
    rpc: (method: string, args: { mutations?: { baseVersion: number }[] }) => ({ abortSignal: async () => ({ data: method === 'sync_pull'
      ? { changes: [], cursor: 0, hasMore: false }
      : { status: 'accepted', records: args.mutations?.map((m) => ({ ...m, version: m.baseVersion + 1 })) }, error: null }) }),
  },
}));
function Probe() {
  const cloud = useCloud()!; const repo = useRepo();
  const rows = useObservable(() => repo.observeRuns(), [repo]);
  return <>
    <p>{cloud.account?.email ?? 'Local only'}</p><p>Runs: {rows?.length ?? 0}</p><p>{cloud.error ?? ''}</p>
    <button onClick={() => repo.createRun({ date: 1, distanceKm: 1, durationSeconds: 300 })}>Add run</button>
    <button onClick={() => { void cloud.signOut().catch(() => {}); }}>Sign out</button>
  </>;
}
beforeEach(() => {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
  auth.account = { id: crypto.randomUUID(), email: 'a@example.test' }; auth.fail = false; auth.signOutFails = false;
  vi.stubGlobal('File', class {
    private value: string;
    constructor(parts: string[]) { this.value = parts.join(''); }
    async text() { return this.value; }
  });
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
  it('automatically merges existing local history into a signed-in account', async () => {
    const marker = crypto.randomUUID();
    await dexieRepository.createRun({ date: 10, distanceKm: 3, durationSeconds: 900, notes: marker });
    const localRun = (await new Promise<import('@/types').Run[]>((resolve, reject) => {
      const sub = dexieRepository.observeRuns().subscribe({ next: (runs) => { sub.unsubscribe(); resolve(runs); }, error: reject });
    })).find((run) => run.notes === marker)!;
    try {
      render(<CloudProvider><Probe /></CloudProvider>);
      expect(await screen.findByText('Runs: 1')).toBeInTheDocument();
    } finally {
      await dexieRepository.deleteRun(localRun.id);
    }
  });

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

it('hides cached account data on explicit sign-out even if the network request fails', async () => {
  const user = userEvent.setup(); auth.signOutFails = true;
  render(<CloudProvider><Probe /></CloudProvider>);
  await screen.findByText('a@example.test');
  await user.click(screen.getByText('Sign out'));
  expect(await screen.findByText('Local only')).toBeInTheDocument();
  expect(localStorage.getItem('progression:last-account:integration-test:signed-out')).toBe('true');
  act(() => { auth.callback?.('TOKEN_REFRESHED', { user: auth.account }); });
  expect(screen.getByText('Local only')).toBeInTheDocument();
});

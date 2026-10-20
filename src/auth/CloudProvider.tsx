import * as React from 'react';
import { readAccount, saveAccount, isLocallySignedOut, setLocallySignedOut } from './accountCache';
import { cloudClient, cloudProject, completeOAuth } from './client';
import { DexieRepository, dexieRepository } from '@/storage/dexie/DexieRepository';
import { RepositoryProvider } from '@/storage/RepositoryProvider';
import { SyncCoordinator } from '@/storage/sync/coordinator';
import { SupabaseTransport } from '@/storage/sync/supabaseTransport';
import type { SyncStatus, SyncConflict } from '@/storage/sync/types';
import { useObservable } from '@/hooks/useObservable';

interface Account { id: string; email?: string }
type OAuthProvider = 'google' | 'github';
interface CloudContextValue {
  configured: boolean;
  account: Account | null;
  status: SyncStatus;
  conflicts: SyncConflict[];
  localMergeSkipped: number;
  error?: string;
  signIn(provider: OAuthProvider): Promise<void>;
  signOut(): Promise<void>;
  resolve(id: string, choice: 'local' | 'remote'): Promise<void>;
}
const CloudContext = React.createContext<CloudContextValue | null>(null);
export const useCloud = () => React.useContext(CloudContext);

/** Owns account identity, repository lifetime and late-response cancellation together. */
export function CloudProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = React.useState<Account | null>(null);
  const [ready, setReady] = React.useState(!cloudClient);
  const [error, setError] = React.useState<string>();
  React.useEffect(() => {
    if (!cloudClient) return;
    let alive = true;
    const { data } = cloudClient.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      if (isLocallySignedOut(cloudProject)) { setAccount(null); return; }
      if (session?.user) {
        const identity = { id: session.user.id, email: session.user.email };
        saveAccount(cloudProject, identity); setAccount(identity);
      } else setAccount(readAccount(cloudProject));
    });
    completeOAuth().then(async () => {
      const result = await cloudClient!.auth.getSession();
      if (result.error) throw result.error;
      if (alive) {
        const identity = isLocallySignedOut(cloudProject) ? null : result.data.session?.user ?? readAccount(cloudProject);
        if (identity) saveAccount(cloudProject, identity);
        setAccount(identity);
      }
    }).catch((reason: unknown) => {
      if (alive) { setAccount(isLocallySignedOut(cloudProject) ? null : readAccount(cloudProject)); setError(reason instanceof Error ? reason.message : 'Sign-in failed'); }
    }).finally(() => { if (alive) setReady(true); });
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, []);
  if (!ready) return <p className="p-6" role="status">Opening your workout data…</p>;
  return <AccountScope key={`${cloudProject}/${account?.id ?? 'local'}`} account={account} error={error} setError={setError} onSignedOut={() => setAccount(null)}>
    {children}
  </AccountScope>;
}

function AccountScope({ account, error, setError, onSignedOut, children }: {
  account: Account | null; error?: string; setError(value?: string): void; onSignedOut(): void; children: React.ReactNode;
}) {
  const [repo] = React.useState(() => account
    ? new DexieRepository(`progression:${cloudProject}:${account.id}`, `${cloudProject}/${account.id}`)
    : dexieRepository);
  const [coordinator] = React.useState(() => account && cloudClient
    ? new SyncCoordinator(repo, new SupabaseTransport(cloudClient), `${cloudProject}/${account.id}`) : null);
  const status = useObservable(() => repo.observeSyncStatus(), [repo]) ?? { pending: 0, conflicts: 0 };
  const conflicts = useObservable(() => repo.observeConflicts(), [repo]) ?? [];
  const [localMergeSkipped, setLocalMergeSkipped] = React.useState(0);
  const alive = React.useRef(true);
  React.useEffect(() => {
    alive.current = true;
    coordinator?.resume();
    let running = false;
    let localHistoryMerged = false;
    const run = async () => {
      if (!navigator.onLine || !coordinator || running) return;
      running = true;
      try {
        // Pull account records first, then add missing records from the original local database.
        await coordinator.sync();
        if (!localHistoryMerged) {
          const backup = await dexieRepository.createBackup();
          const result = await repo.importData(new File([JSON.stringify(backup)], 'local-history.json', { type: 'application/json' }),
            { preferences: 'keep', conflicts: 'skip' });
          if (alive.current) setLocalMergeSkipped(result.skippedConflicts);
          localHistoryMerged = true;
          await coordinator.sync();
        }
        if (alive.current) setError(undefined);
      } catch (reason: unknown) {
        if (alive.current) setError(reason instanceof Error ? reason.message : 'Sync failed');
      } finally {
        running = false;
      }
    };
    void run();
    const interval = window.setInterval(run, 15_000);
    window.addEventListener('online', run);
    window.addEventListener('focus', run);
    return () => {
      alive.current = false; window.clearInterval(interval);
      window.removeEventListener('online', run); window.removeEventListener('focus', run);
      coordinator?.stop();
      // StrictMode cleanup is followed by another mount; defer disposal to a real unmount.
      queueMicrotask(() => { if (!alive.current && account) repo.close(); });
    };
  }, [repo, coordinator, account, setError]);
  React.useEffect(() => {
    if (status.pending && coordinator && navigator.onLine) coordinator.sync().catch((reason: unknown) => {
      if (alive.current) setError(reason instanceof Error ? reason.message : 'Sync failed');
    });
  }, [status.pending, coordinator, setError]);

  const value: CloudContextValue = {
    configured: !!cloudClient, account, status, conflicts, localMergeSkipped, error,
    async signIn(provider) {
      setLocallySignedOut(cloudProject, false);
      const { error } = await cloudClient!.auth.signInWithOAuth({ provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` } });
      if (error) throw error;
    },
    async signOut() {
      setLocallySignedOut(cloudProject, true);
      saveAccount(cloudProject, null);
      coordinator?.stop();
      onSignedOut();
      const { error } = await cloudClient!.auth.signOut({ scope: 'local' });
      if (error) throw error;
    },
    async resolve(id, choice) { await repo.resolveConflict(id, choice); await coordinator?.sync(); },
  };
  return <CloudContext.Provider value={value}><RepositoryProvider repository={repo}>{children}</RepositoryProvider></CloudContext.Provider>;
}

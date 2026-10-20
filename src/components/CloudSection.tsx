import * as React from 'react';
import { useCloud } from '@/auth/CloudProvider';
import { Button } from '@/components/ui/button';

export function CloudSection() {
  const cloud = useCloud();
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string>();
  if (!cloud) return null;
  const act = async (action: () => Promise<void>) => {
    setBusy(true); setMessage(undefined);
    try { await action(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Action failed'); }
    finally { setBusy(false); }
  };
  return <section className="flex flex-col gap-3 border-t border-border pt-6" aria-label="Cloud account">
    <h2 className="font-semibold">Account and sync</h2>
    {!cloud.configured ? <p className="text-sm text-muted-foreground">Cloud sync is not configured. Your records are saved on this device.</p>
      : !cloud.account ? <>
        <p className="text-sm text-muted-foreground">Sign in to sync your local history across devices whenever you’re online.</p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => act(() => cloud.signIn('github'))}>Continue with GitHub</Button>
          <Button variant="outline" disabled={busy} onClick={() => act(() => cloud.signIn('google'))}>Continue with Google</Button>
        </div>
      </> : <>
        <p className="text-sm">{cloud.account.email ?? 'Signed in'}</p>
        <p role="status" className="text-sm text-muted-foreground">
          {cloud.status.conflicts ? `${cloud.status.conflicts} conflicts need review` : cloud.status.pending ? `${cloud.status.pending} changes saved locally, waiting to sync` : cloud.status.lastSyncedAt ? `Synced ${new Date(cloud.status.lastSyncedAt).toLocaleString()}` : 'Checking cloud history…'}
        </p>
        {cloud.localMergeSkipped > 0 && <p role="status" className="text-xs text-muted-foreground">
          {cloud.localMergeSkipped} local {cloud.localMergeSkipped === 1 ? 'record was' : 'records were'} kept on this device because this account already has data for those IDs.
        </p>}
        <Button variant="outline" disabled={busy} onClick={() => act(cloud.signOut)}>Sign out</Button>
        <p className="text-xs text-muted-foreground">Local history and new workouts sync automatically while you’re signed in and online.</p>
      </>}
        {cloud.conflicts.map((conflict) => <div className="rounded-xl border border-border p-3" key={conflict.id}>
          <p className="font-medium">{conflict.error ?? 'Competing edits'}</p>
          <p className="my-2 text-xs">This choice applies to the linked edits in this group, including later pending edits. Export a backup to preserve both versions.</p>
          <details className="mb-3 text-xs"><summary>Review both versions</summary>
            <p>Local changes</p><pre className="overflow-auto">{JSON.stringify(conflict.operation.mutations, null, 2)}</pre>
            <p>Cloud versions at conflict</p><pre className="overflow-auto">{JSON.stringify(conflict.records, null, 2)}</pre>
          </details>
          <div className="flex gap-2">
            <Button variant="outline" disabled={busy} onClick={() => act(() => cloud.resolve(conflict.id, 'local'))}>Keep current local values</Button>
            <Button variant="outline" disabled={busy} onClick={() => {
              if (window.confirm('Replace linked local edits with the latest received cloud values? Export a backup first if you want to keep both.')) act(() => cloud.resolve(conflict.id, 'remote'));
            }}>Use cloud values</Button>
          </div>
        </div>)}
    {(message || cloud.error || cloud.status.error) && <p role="alert" className="text-sm text-destructive">{message ?? cloud.error ?? cloud.status.error}</p>}
  </section>;
}

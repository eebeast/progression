import { useRegisterSW } from 'virtual:pwa-register/react';
import { useLocation } from 'react-router-dom';
import { useRepo } from '@/storage/RepositoryProvider';
import { useObservable } from '@/hooks/useObservable';
import { Button } from '@/components/ui/button';

/** Updates are user-triggered and deferred throughout active workouts and editing routes. */
export function PwaStatus() {
  const { offlineReady: [offlineReady, setOfflineReady], needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW();
  const repo = useRepo(); const { pathname } = useLocation();
  const active = useObservable(() => repo.observeActiveSession(), [repo]);
  const safe = active === null && pathname === '/';
  if (!offlineReady && !needRefresh) return null;
  return <aside role="status" className="flex flex-wrap items-center gap-3 border-b border-border bg-card p-3 text-sm">
    <span>{needRefresh ? safe ? 'An app update is ready.' : 'Update ready. Finish your workout or edits, then return to Today to apply it.' : 'Ready to open offline on this device.'}</span>
    {needRefresh && <Button variant="outline" disabled={!safe} onClick={() => {
      if (window.confirm('Reload to update Progression? Finish any unsaved entry in other open windows first. Saved workout data and pending sync changes will remain.')) void updateServiceWorker(true);
    }}>Update app</Button>}
    <Button variant="ghost" onClick={() => { setOfflineReady(false); setNeedRefresh(false); }}>Later</Button>
  </aside>;
}

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function RestTimer({ endsAt, initialSeconds, onChange }: {
  endsAt?: number | null; initialSeconds?: number; onChange(value: number | null): Promise<void>;
}) {
  const [seconds, setSeconds] = React.useState(initialSeconds ?? 0);
  const [now, setNow] = React.useState(Date.now());
  const [error, setError] = React.useState<string>();
  React.useEffect(() => {
    const tick = () => setNow(Date.now()); tick();
    const interval = window.setInterval(tick, 1000);
    window.addEventListener('focus', tick);
    return () => { window.clearInterval(interval); window.removeEventListener('focus', tick); };
  }, []);
  const remaining = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;
  const change = async (value: number | null) => {
    setError(undefined);
    try { await onChange(value); setNow(Date.now()); } catch { setError('Timer could not be saved.'); }
  };
  return <details open={!!endsAt} className="rounded-xl border border-border p-3" aria-label="Rest timer"><summary className="cursor-pointer text-sm font-medium text-muted-foreground">Rest timer</summary><div className="mt-3 flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <label className="flex-1 text-sm">Rest seconds<Input aria-label="Rest seconds" type="number" min={0} step={5} value={seconds} onChange={(e) => setSeconds(Math.max(0, Number(e.target.value)))} /></label>
      <Button variant="outline" disabled={!Number.isFinite(seconds) || seconds <= 0} onClick={() => change(Date.now() + seconds * 1000)}>Start timer</Button>
      {endsAt && <Button variant="ghost" onClick={() => change(null)}>Clear timer</Button>}
    </div>
    {!!endsAt && <p role="timer" className="text-sm tabular-nums">{remaining ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')} remaining` : 'Rest timer finished'}</p>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
  </div></details>;
}

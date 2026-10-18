import * as React from 'react';
import { Button } from '@/components/ui/button';

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
export function InstallSection() {
  const [prompt, setPrompt] = React.useState<InstallPrompt>();
  const [installed, setInstalled] = React.useState(() => window.matchMedia('(display-mode: standalone)').matches);
  React.useEffect(() => {
    const before = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const done = () => { setInstalled(true); setPrompt(undefined); };
    window.addEventListener('beforeinstallprompt', before); window.addEventListener('appinstalled', done);
    return () => { window.removeEventListener('beforeinstallprompt', before); window.removeEventListener('appinstalled', done); };
  }, []);
  return <section className="flex flex-col gap-2 border-t border-border pt-6" aria-label="Install app">
    <h2 className="font-semibold">Install Progression</h2>
    {installed ? <p className="text-sm">Opened as an installed app.</p> : prompt ? <Button variant="outline" onClick={async () => { await prompt.prompt(); await prompt.userChoice; setPrompt(undefined); }}>Install app</Button>
      : <p className="text-sm text-muted-foreground">On iPhone or iPad, open in Safari and choose Share, then Add to Home Screen. In other supported browsers, use the browser’s Install app or Add to Home Screen menu.</p>}
    <p className="text-xs text-muted-foreground">Open online once to prepare offline access. Records save on this device first; cloud sync runs while the app is open or resumes online.</p>
  </section>;
}

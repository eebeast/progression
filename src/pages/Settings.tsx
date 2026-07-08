import * as React from 'react';
import { Download, Upload } from 'lucide-react';
import { useRepo } from '@/storage/RepositoryProvider';
import { useSettings } from '@/hooks/useSettings';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Stepper } from '@/components/Stepper';
import { cn } from '@/lib/utils';
import type { Accent, Theme } from '@/types';

const ACCENTS: { key: Accent; label: string; color: string }[] = [
  { key: 'blue', label: 'Blue', color: '#0071E3' },
  { key: 'purple', label: 'Purple', color: '#5856D6' },
  { key: 'orange', label: 'Orange', color: '#F5730A' },
  { key: 'green', label: 'Green', color: '#34C759' },
];

function SegButton<T extends string>({
  value,
  current,
  onClick,
  children,
}: {
  value: T;
  current: T;
  onClick: (v: T) => void;
  children: React.ReactNode;
}) {
  const active = value === current;
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      aria-pressed={active}
      className={cn(
        'h-11 flex-1 rounded-lg border text-sm font-semibold capitalize transition-colors',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-card text-muted-foreground',
      )}
    >
      {children}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const repo = useRepo();
  const { settings } = useSettings();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [importError, setImportError] = React.useState<string | null>(null);

  const onImportFile = async (file: File) => {
    setImportError(null);
    const ok = window.confirm(
      'Importing replaces ALL current data with the backup. This cannot be undone. Continue?',
    );
    if (!ok) return;
    try {
      await repo.importData(file);
      window.location.reload();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed.');
    }
  };

  return (
    <div>
      <PageHeader title="Settings" />

      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-5">
        <Row label="Name">
          <Input
            value={settings.userName}
            onChange={(e) => repo.updateSettings({ userName: e.target.value })}
            placeholder="Your name"
          />
        </Row>

        <Row label="Theme">
          <div className="flex gap-2">
            {(['light', 'dark', 'system'] as Theme[]).map((t) => (
              <SegButton key={t} value={t} current={settings.theme} onClick={(v) => repo.updateSettings({ theme: v })}>
                {t}
              </SegButton>
            ))}
          </div>
        </Row>

        <Row label="Accent">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ACCENTS.map((a) => {
              const active = settings.accent === a.key;
              return (
                <button
                  key={a.key}
                  type="button"
                  aria-label={a.label}
                  aria-pressed={active}
                  onClick={() => repo.updateSettings({ accent: a.key })}
                  className={cn(
                    'flex h-11 items-center justify-center gap-2 rounded-md border text-sm font-semibold transition active:scale-[0.95]',
                    active
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-card text-muted-foreground',
                  )}
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded-full"
                    style={{ backgroundColor: a.color }}
                  />
                  {a.label}
                </button>
              );
            })}
          </div>
        </Row>

        <Row label="Weight increment">
          <div className="flex gap-2">
            {[1, 2.5, 5].map((inc) => (
              <SegButton
                key={inc}
                value={String(inc)}
                current={String(settings.weightIncrement)}
                onClick={() => repo.updateSettings({ weightIncrement: inc })}
              >
                {inc}
                {settings.unit}
              </SegButton>
            ))}
          </div>
        </Row>

        <Row label="Weekly goal (active days)">
          <div className="max-w-xs">
            <Stepper
              label=""
              value={settings.weeklyGoal}
              onChange={(v) => repo.updateSettings({ weeklyGoal: v })}
              step={1}
              min={1}
              max={7}
              unit="days"
            />
          </div>
        </Row>

        <Row label="Exercises tab">
          <div className="flex gap-2">
            <SegButton
              value="off"
              current={settings.showExerciseLibrary ? 'on' : 'off'}
              onClick={() => repo.updateSettings({ showExerciseLibrary: false })}
            >
              Off
            </SegButton>
            <SegButton
              value="on"
              current={settings.showExerciseLibrary ? 'on' : 'off'}
              onClick={() => repo.updateSettings({ showExerciseLibrary: true })}
            >
              On
            </SegButton>
          </div>
          <p className="text-xs text-muted-foreground">
            Adds a tab to browse each exercise and its top sets.
          </p>
        </Row>

        <div className="flex flex-col gap-3 border-t border-border pt-6">
          <Label>Backup</Label>
          <Button variant="outline" onClick={() => repo.exportData()}>
            <Download className="h-4 w-4" />
            Export backup
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Import backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImportFile(file);
              e.target.value = '';
            }}
          />
          {importError && <p className="text-sm text-destructive">{importError}</p>}
          <p className="text-xs text-muted-foreground">
            Importing replaces all current data. Everything stays on this device.
          </p>
        </div>
      </div>
    </div>
  );
}

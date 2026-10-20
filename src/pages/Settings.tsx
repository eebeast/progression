import * as React from 'react';
import { InstallSection } from '@/components/InstallSection';
import { CloudSection } from '@/components/CloudSection';
import { useCloud } from '@/auth/CloudProvider';
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
  const cloud = useCloud();
  const { settings } = useSettings();
  const [heightUnit, setHeightUnit] = React.useState<'cm' | 'in'>('cm');
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [importError, setImportError] = React.useState<string | null>(null);

  const onImportFile = async (file: File) => {
    setImportError(null);
    try {
      const report = await repo.inspectImport(file);
      const counts = Object.entries(report.counts)
        .map(([type, count]) => `${type}: ${count}`)
        .join('\n');
      const warnings = report.warnings.length
        ? `\n\nReview warnings:\n${report.warnings.slice(0, 5).map((warning) => `- ${warning}`).join('\n')}${
            report.warnings.length > 5 ? `\n- And ${report.warnings.length - 5} more.` : ''
          }`
        : '';
      const ok = window.confirm(
        `This backup contains:\n${counts}${warnings}\n\n${cloud?.account ? 'Copy records into this account? Different records with the same ID will block the import.' : 'Importing replaces ALL current data. This cannot be undone. Continue?'}`,
      );
      if (!ok) return;
      await repo.importData(file, cloud?.account ? { preferences: window.confirm('Also use the backup’s name, units and appearance? Cancel keeps current account preferences while importing history.') ? 'source' : 'keep' } : undefined);
      window.location.reload();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed.');
    }
  };

  return (
    <div>
      <PageHeader title="Settings" />

      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-5">
        <CloudSection />
        <InstallSection />
        <Row label="Name">
          <Input
            value={settings.userName}
            onChange={(e) => repo.updateSettings({ userName: e.target.value })}
            placeholder="Your name"
          />
        </Row>

        <Row label="Height">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="decimal"
              min={heightUnit === 'cm' ? 40 : 15.7}
              max={heightUnit === 'cm' ? 250 : 98.4}
              step="0.1"
              aria-label="Height"
              value={settings.heightCm == null ? '' : heightUnit === 'cm' ? String(settings.heightCm) : (settings.heightCm / 2.54).toFixed(1)}
              onChange={(e) => {
                const value = e.target.value === '' ? undefined : Number(e.target.value);
                if (value === undefined) void repo.updateSettings({ heightCm: undefined });
                else if (Number.isFinite(value)) void repo.updateSettings({ heightCm: heightUnit === 'cm' ? value : value * 2.54 });
              }}
              placeholder={heightUnit === 'cm' ? 'e.g. 175' : 'e.g. 69'}
              className="max-w-40"
            />
            <div className="flex w-28 gap-2">
              {(['cm', 'in'] as const).map((unit) => (
                <SegButton key={unit} value={unit} current={heightUnit} onClick={setHeightUnit}>{unit}</SegButton>
              ))}
            </div>
          </div>
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
            {cloud?.account ? 'Account imports add records and queue cloud updates. You can choose whether backup settings replace account settings.' : 'Importing replaces all local data on this device. When you sign in, local history syncs automatically while online.'}
          </p>
        </div>
      </div>
    </div>
  );
}

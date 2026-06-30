import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dateKey, keyToLocalMidnight } from '@/utils/activity';
import { formatPace, formatSpeed } from '@/utils/runMetrics';

export interface RunDraft {
  dateKey: string;
  distance: string;
  minutes: string;
  seconds: string;
}

export function emptyDraft(): RunDraft {
  return { dateKey: dateKey(Date.now()), distance: '', minutes: '', seconds: '' };
}

export function draftFromRun(run: {
  date: number;
  distanceKm: number;
  durationSeconds: number;
}): RunDraft {
  return {
    dateKey: dateKey(run.date),
    distance: String(run.distanceKm),
    minutes: String(Math.floor(run.durationSeconds / 60)),
    seconds: String(run.durationSeconds % 60),
  };
}

export function parseDraft(draft: RunDraft): {
  date: number;
  distanceKm: number;
  durationSeconds: number;
} {
  const distanceKm = Math.max(0, parseFloat(draft.distance) || 0);
  const minutes = Math.max(0, parseInt(draft.minutes, 10) || 0);
  const seconds = Math.max(0, Math.min(59, parseInt(draft.seconds, 10) || 0));
  return {
    date: keyToLocalMidnight(draft.dateKey),
    distanceKm,
    durationSeconds: minutes * 60 + seconds,
  };
}

export function isDraftValid(draft: RunDraft): boolean {
  const { distanceKm, durationSeconds } = parseDraft(draft);
  return distanceKm > 0 && durationSeconds > 0;
}

interface RunFieldsProps {
  draft: RunDraft;
  onChange: (draft: RunDraft) => void;
  idPrefix?: string;
}

export function RunFields({ draft, onChange, idPrefix = 'run' }: RunFieldsProps) {
  const set = (patch: Partial<RunDraft>) => onChange({ ...draft, ...patch });
  const metrics = parseDraft(draft);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-date`}>Date</Label>
        <Input
          id={`${idPrefix}-date`}
          type="date"
          value={draft.dateKey}
          max={dateKey(Date.now())}
          onChange={(e) => set({ dateKey: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-distance`}>Distance (km)</Label>
        <Input
          id={`${idPrefix}-distance`}
          inputMode="decimal"
          pattern="[0-9]*[.,]?[0-9]*"
          placeholder="5.0"
          value={draft.distance}
          onChange={(e) => set({ distance: e.target.value })}
          className="tabular-nums"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Duration</Label>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              aria-label="Minutes"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Min"
              value={draft.minutes}
              onChange={(e) => set({ minutes: e.target.value })}
              className="text-center tabular-nums"
            />
          </div>
          <span className="pb-3 text-lg font-semibold text-muted-foreground">:</span>
          <div className="flex-1">
            <Input
              aria-label="Seconds"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Sec"
              value={draft.seconds}
              onChange={(e) => set({ seconds: e.target.value })}
              className="text-center tabular-nums"
            />
          </div>
        </div>
      </div>

      {/* Live derived metrics */}
      <div className="flex items-center justify-around rounded-lg bg-muted/50 px-3 py-2">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Pace</p>
          <p className="font-semibold tabular-nums">{formatPace(metrics)}</p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Speed</p>
          <p className="font-semibold tabular-nums">{formatSpeed(metrics)}</p>
        </div>
      </div>
    </div>
  );
}

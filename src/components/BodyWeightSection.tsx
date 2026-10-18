import * as React from 'react';
import { Check, Plus, Scale, Trash2, X } from 'lucide-react';
import type { BodyWeightEntry, Unit } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Stepper } from '@/components/Stepper';
import { EmptyState } from '@/components/FeelingPicker';
import { formatDate } from '@/utils/format';
import { dateKey, keyToLocalMidnight, todayKey } from '@/utils/activity';

/** Body weight is logged in 0.5 steps regardless of the lift increment. */
const WEIGHT_STEP = 0.5;

interface BodyWeightSectionProps {
  entries: BodyWeightEntry[];
  unit: Unit;
  onAdd: (input: { date: number; weight: number }) => void | Promise<unknown>;
  allowAdd?: boolean;
  onUpdate: (id: string, patch: { date: number; weight: number }) => void;
  onDelete: (id: string) => void;
}

/** Historical weight entries; Activity hides creation because new entries live on Today. */
export function BodyWeightSection({
  entries,
  unit,
  onAdd,
  onUpdate,
  onDelete,
  allowAdd = true,
}: BodyWeightSectionProps) {
  const [showForm, setShowForm] = React.useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">Body weight</h3>
        {allowAdd && !showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Add entry
          </Button>
        )}
      </div>

      {showForm && (
        <BodyWeightForm
          unit={unit}
          defaultWeight={entries[0]?.weight ?? 0}
          onSave={async (input) => {
            await onAdd(input);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {entries.length === 0
        ? !showForm && (
            <EmptyState
              icon={<Scale className="h-9 w-9" />}
              title="No entries yet"
              description={allowAdd ? 'Log your weight to keep a simple record over time.' : 'Add body weight from the Today tab.'}
            />
          )
        : (
            <div className="flex flex-col gap-2">
              {entries.map((entry) => (
                <BodyWeightRow
                  key={entry.id}
                  entry={entry}
                  unit={unit}
                  onSave={(patch) => onUpdate(entry.id, patch)}
                  onDelete={() => onDelete(entry.id)}
                />
              ))}
            </div>
          )}
    </div>
  );
}

interface BodyWeightFormProps {
  unit: Unit;
  defaultWeight: number;
  onSave: (input: { date: number; weight: number }) => void | Promise<unknown>;
  onCancel: () => void;
}

export function BodyWeightForm({ unit, defaultWeight, onSave, onCancel }: BodyWeightFormProps) {
  const [key, setKey] = React.useState(() => todayKey());
  const [weight, setWeight] = React.useState(defaultWeight);
  const savingRef = React.useRef(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const save = async () => {
    if (!Number.isFinite(weight) || weight <= 0 || savingRef.current) return;
    savingRef.current = true; setSaving(true); setError(undefined);
    try { await onSave({ date: keyToLocalMidnight(key), weight }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Body weight could not be saved.'); }
    finally { savingRef.current = false; setSaving(false); }
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="bw-date">Date</Label>
          <Input
            id="bw-date"
            type="date"
            value={key}
            max={dateKey(Date.now())}
            onChange={(e) => setKey(e.target.value)}
          />
        </div>
        <Stepper label="Weight" value={weight} onChange={setWeight} step={WEIGHT_STEP} unit={unit} decimal />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" disabled={saving} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={saving || !Number.isFinite(weight) || weight <= 0}
            onClick={save}
          >
            {saving ? 'Saving…' : 'Save weight'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface BodyWeightRowProps {
  entry: BodyWeightEntry;
  unit: Unit;
  onSave: (patch: { date: number; weight: number }) => void;
  onDelete: () => void;
}

/** A logged weight. Tap to edit inline or delete (same pattern as a set/run). */
function BodyWeightRow({ entry, unit, onSave, onDelete }: BodyWeightRowProps) {
  const [editing, setEditing] = React.useState(false);
  const [key, setKey] = React.useState(dateKey(entry.date));
  const [weight, setWeight] = React.useState(entry.weight);

  React.useEffect(() => {
    if (!editing) {
      setKey(dateKey(entry.date));
      setWeight(entry.weight);
    }
  }, [entry.date, entry.weight, editing]);

  if (editing) {
    return (
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">Edit entry</span>
          <button
            type="button"
            aria-label="Cancel edit"
            onClick={() => setEditing(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <Input
            aria-label="Date"
            type="date"
            value={key}
            max={dateKey(Date.now())}
            onChange={(e) => setKey(e.target.value)}
          />
          <Stepper label="Weight" value={weight} onChange={setWeight} step={WEIGHT_STEP} unit={unit} decimal />
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => {
              onDelete();
              setEditing(false);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <Button
            className="flex-1"
            disabled={weight <= 0}
            onClick={() => {
              onSave({ date: keyToLocalMidnight(key), weight });
              setEditing(false);
            }}
          >
            <Check className="h-4 w-4" />
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50"
    >
      <span className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Scale className="h-4 w-4" />
        </span>
        <span className="text-sm text-muted-foreground">{formatDate(entry.date)}</span>
      </span>
      <span className="text-lg font-semibold tabular-nums">
        {entry.weight}
        {unit}
      </span>
    </button>
  );
}

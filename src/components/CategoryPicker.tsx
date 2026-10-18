import { EXERCISE_CATEGORIES } from '@/utils/muscleGroups';
import { cn } from '@/lib/utils';
import type { ExerciseCategory } from '@/types';
import { useId } from 'react';

export function CategoryPicker({ value, onChange }: { value?: ExerciseCategory; onChange(value: ExerciseCategory): void }) {
  const name = useId();
  return <fieldset className="min-w-0"><legend className="mb-2 text-sm font-medium">Category <span className="font-normal text-muted-foreground">(required)</span></legend>
    <div className="flex flex-wrap gap-2">{EXERCISE_CATEGORIES.map((category) => <label key={category} className={cn('cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background', category === value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted')}>
      <input type="radio" name={name} className="sr-only" required checked={category === value} onChange={() => onChange(category)} />{category}
    </label>)}</div>
  </fieldset>;
}

import { Link } from 'react-router-dom';
import type { BodyWeightEntry, Unit } from '@/types';
import { adultBmi, latestBodyWeight } from '@/utils/bmi';
import { cn } from '@/lib/utils';

export function BmiSummary({ heightCm, weights, unit }: { heightCm?: number; weights: BodyWeightEntry[]; unit: Unit }) {
  const latest = latestBodyWeight(weights);
  const bmi = latest ? adultBmi(heightCm, latest.weight, unit) : null;
  return <section aria-label="Adult BMI" className="mt-5 border-t border-border pt-4">
    <h3 className="text-sm font-semibold">Adult BMI</h3>
    {bmi && latest ? <>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <p className="text-3xl font-bold tabular-nums">{bmi.value.toFixed(1)}</p>
        <span className={cn('rounded-lg px-2.5 py-1 text-sm font-semibold', bmi.outsideReferenceRange ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'bg-primary/10 text-primary')}>{bmi.category}</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Latest measurement: {latest.weight} {unit} · {heightCm?.toLocaleString(undefined, { maximumFractionDigits: 1 })} cm · {new Date(latest.date).toLocaleDateString()}</p>
      <p className="mt-2 text-sm">{bmi.outsideReferenceRange
        ? 'Outside the adult reference range. This may indicate increased health risk; a clinician can assess your individual risk.'
        : 'Within the adult reference range (18.5 to below 25).'}</p>
    </> : <p className="mt-2 text-sm text-muted-foreground">
      {!heightCm || !Number.isFinite(heightCm) || heightCm <= 0
        ? <><Link to="/settings" className="font-semibold text-primary">Add your height in Settings</Link> to calculate BMI.</>
        : <><Link to="/" className="font-semibold text-primary">Log a valid body weight in Today</Link> to calculate BMI.</>}
    </p>}
    <p className="mt-3 text-xs text-muted-foreground">For adults 20+. BMI is a screening measure, not a diagnosis, and cannot distinguish muscle from fat. <a className="font-semibold text-primary underline underline-offset-2" href="https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html" target="_blank" rel="noreferrer">CDC BMI ranges</a></p>
  </section>;
}

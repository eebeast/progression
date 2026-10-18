import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';

export function CategoryActivityChart({ rows, selected, onSelect, unit }: {
  rows: { category: string; workouts: number; heaviestLoad: number | null }[]; unit: string; selected: string | null; onSelect(category: string): void;
}) {
  return <>
    <div className="h-64 min-w-0" role="img" aria-label="Heaviest recorded set load by exercise category">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart layout="vertical" data={rows} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
          <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
          <YAxis type="category" dataKey="category" width={82} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
          <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} contentStyle={{ background: 'var(--card)', borderColor: 'var(--border)', borderRadius: 12, color: 'var(--foreground)', fontSize: 12 }} />
          <Bar dataKey="heaviestLoad" name={`Heaviest set (${unit})`} fill="var(--primary)" radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false} className="cursor-pointer" onClick={(_data, index) => onSelect(rows[index].category)} />
        </BarChart>
      </ResponsiveContainer>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="Exercise categories">{rows.map((row) => <button key={row.category} type="button" aria-pressed={selected === row.category} onClick={() => onSelect(row.category)} className={cn('flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm', selected === row.category ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted')}><span>{row.category}</span><span className="font-semibold tabular-nums">{row.heaviestLoad === null ? '—' : `${row.heaviestLoad} ${unit}`}</span></button>)}</div>
  </>;
}

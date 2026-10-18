import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts';

export interface OverviewPoint { date: number; through?: number; value: number; detail?: string }
const shortDate = (date: number) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
function dateLabel(point: OverviewPoint) {
  const format = (date: number) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return point.through && shortDate(point.through) !== shortDate(point.date) ? `${format(point.date)} – ${format(point.through)}` : format(point.date);
}

/** Recorded values only, with a data table for assistive technology. */
export function OverviewChart({ points, label, unit = '', line = false, perSet = false }: {
  points: OverviewPoint[]; label: string; unit?: string; line?: boolean; perSet?: boolean;
}) {
  const data = points.map((point, index) => ({ ...point, index }));
  const formatValue = (value: number) => `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}`;
  const tooltip = ({ active, payload }: TooltipContentProps) => {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload as OverviewPoint;
    return <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 text-muted-foreground">{dateLabel(point)}</p><p className="font-semibold">{label}: {formatValue(point.value)}</p>
      {point.detail && <p className="mt-1 text-muted-foreground">{point.detail}</p>}
    </div>;
  };
  const axes = <>
    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" strokeOpacity={0.6} />
    <XAxis dataKey={perSet ? 'index' : 'date'} type={line && !perSet ? 'number' : 'category'} domain={line && !perSet ? ['dataMin', 'dataMax'] : undefined} tickFormatter={perSet ? (index) => shortDate(points[index].date) : shortDate} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} minTickGap={24} tickMargin={12} />
    <YAxis width={38} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={line || unit === 'km'} domain={line ? ['auto', 'auto'] : [0, 'dataMax']} />
    <Tooltip content={tooltip} cursor={line ? { stroke: 'var(--border)' } : { fill: 'var(--muted)', opacity: 0.5 }} />
  </>;
  return <>
    <div className="h-56 w-full min-w-0" role="img" aria-label={`${label} chart. ${points.length} ${line ? 'measurements' : 'periods'}.`}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        {line ? <LineChart data={data} margin={{ top: 12, right: 12, bottom: 8, left: 0 }}>
          {axes}<Line type="linear" dataKey="value" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3.5, fill: 'var(--primary)', stroke: 'var(--card)', strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive={false} />
        </LineChart> : <BarChart data={data} margin={{ top: 12, right: 4, bottom: 8, left: 0 }} barCategoryGap="35%">
          {axes}<Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive={false} />
        </BarChart>}
      </ResponsiveContainer>
    </div>
    <table className="sr-only"><caption>{label} recorded values</caption><thead><tr><th>Date</th><th>{label}</th></tr></thead>
      <tbody>{points.map((point, index) => <tr key={`${point.date}-${index}`}><td>{dateLabel(point)}{point.detail && ` · ${point.detail}`}</td><td>{formatValue(point.value)}</td></tr>)}</tbody>
    </table>
  </>;
}

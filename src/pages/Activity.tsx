import * as React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Dumbbell } from 'lucide-react';
import { useRepo } from '@/storage/RepositoryProvider';
import { useObservable } from '@/hooks/useObservable';
import { useSettings } from '@/hooks/useSettings';
import Analytics from '@/pages/Analytics';
import { Calendar } from '@/components/Calendar';
import { RunRow } from '@/components/RunRow';
import { BodyWeightSection } from '@/components/BodyWeightSection';
import { FEELING_EMOJI } from '@/components/FeelingPicker';
import { dateKey, keyToLocalMidnight, todayKey } from '@/utils/activity';
import { formatDuration, formatLongDate } from '@/utils/format';

/** One Activity destination for charts, calendar and editing recorded history. */
export default function Activity() {
  const repo = useRepo(); const { settings } = useSettings();
  const sessions = useObservable(() => repo.observeCompletedSessions(), [repo]);
  const runs = useObservable(() => repo.observeRuns(), [repo]);
  const weights = useObservable(() => repo.observeBodyWeights(), [repo]);
  const [selectedKey, setSelectedKey] = React.useState(() => todayKey());
  const activeKeys = React.useMemo(() => new Set([
    ...(sessions ?? []).map((session) => dateKey(session.date)),
    ...(runs ?? []).map((run) => dateKey(run.date)),
  ]), [sessions, runs]);
  const dayLifts = (sessions ?? []).filter((session) => dateKey(session.date) === selectedKey);
  const dayRuns = (runs ?? []).filter((run) => dateKey(run.date) === selectedKey);
  const recentRuns = [...(runs ?? [])].sort((a, b) => b.date - a.date || b.createdAt - a.createdAt).slice(0, 8);
  return <Analytics>
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <section aria-label="Activity calendar" className="flex min-w-0 flex-col gap-3">
        <h2 className="font-semibold">Activity calendar</h2>
        <Calendar activeKeys={activeKeys} selectedKey={selectedKey} onSelectDay={setSelectedKey} />
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">{formatLongDate(keyToLocalMidnight(selectedKey))}</h3>
          {!dayLifts.length && !dayRuns.length ? <p className="mt-2 text-sm text-muted-foreground">Nothing logged this day.</p> : <div className="mt-3 flex flex-col gap-2">
            {dayLifts.map((session) => <Link key={session.id} to={`/history/${session.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 hover:bg-muted/50">
              <span className="flex items-center gap-2.5"><Dumbbell className="h-5 w-5 shrink-0 text-primary" /><span><span className="font-semibold">{session.templateName}</span><span className="block text-xs tabular-nums text-muted-foreground">{formatDuration((session.endTime ?? session.startTime) - session.startTime)}</span></span></span>
              <span className="flex items-center gap-1.5">{session.feeling && <span>{FEELING_EMOJI[session.feeling]}</span>}<ChevronRight className="h-4 w-4 text-muted-foreground" /></span>
            </Link>)}
            {dayRuns.map((run) => <RunRow key={run.id} run={run} onSave={(patch) => repo.updateRun(run.id, patch)} onDelete={() => repo.deleteRun(run.id)} />)}
          </div>}
        </div>
      </section>
      <div className="flex min-w-0 flex-col gap-5">
        <section aria-label="Recent runs" className="flex flex-col gap-3">
          <h2 className="font-semibold">Recent runs</h2>
          {recentRuns.length ? recentRuns.map((run) => <RunRow key={run.id} run={run} showDate onSave={(patch) => repo.updateRun(run.id, patch)} onDelete={() => repo.deleteRun(run.id)} />) : <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">No runs yet. Add a run from Today.</p>}
        </section>
        <BodyWeightSection entries={weights ?? []} unit={settings.unit} allowAdd={false} onAdd={(input) => repo.addBodyWeight(input)} onUpdate={(id, patch) => repo.updateBodyWeight(id, patch)} onDelete={(id) => repo.deleteBodyWeight(id)} />
      </div>
    </div>
  </Analytics>;
}

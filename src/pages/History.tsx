import { useNavigate } from 'react-router-dom';
import { ChevronRight, History as HistoryIcon } from 'lucide-react';
import { useRepo } from '@/storage/RepositoryProvider';
import { useObservable } from '@/hooks/useObservable';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, FEELING_EMOJI } from '@/components/FeelingPicker';
import { formatDate, formatDuration } from '@/utils/format';
import type { WorkoutSession } from '@/types';

export default function HistoryPage() {
  const navigate = useNavigate();
  const repo = useRepo();
  const sessions =
    useObservable(() => repo.observeCompletedSessions(), [repo]) ?? ([] as WorkoutSession[]);

  return (
    <div>
      <PageHeader title="History" />

      <div className="mx-auto w-full max-w-md md:max-w-2xl lg:max-w-3xl xl:max-w-4xl">
        {sessions.length === 0 ? (
          <EmptyState
            icon={<HistoryIcon className="h-10 w-10" />}
            title="No workouts yet"
            description="Once you finish a workout, it'll show up here."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 px-4 py-4 md:grid-cols-2">
            {sessions.map((s) => {
            const duration = formatDuration((s.endTime ?? s.startTime) - s.startTime);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => navigate(`/history/${s.id}`)}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left hover:bg-muted/50"
              >
                <div>
                  <p className="font-semibold">{s.templateName}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(s.date)} · {duration}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {s.feeling && <span className="text-xl">{FEELING_EMOJI[s.feeling]}</span>}
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </button>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

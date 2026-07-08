import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ListChecks } from 'lucide-react';
import { useRepo } from '@/storage/RepositoryProvider';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/FeelingPicker';
import type { Exercise } from '@/types';

/** A-Z list of exercises; tap one to see its personal record and top sets. */
export default function Exercises() {
  const navigate = useNavigate();
  const repo = useRepo();
  const [exercises, setExercises] = React.useState<Exercise[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    repo.listExercises().then((list) => {
      if (!cancelled) setExercises([...list].sort((a, b) => a.name.localeCompare(b.name)));
    });
    return () => {
      cancelled = true;
    };
  }, [repo]);

  return (
    <div>
      <PageHeader title="Exercises" />

      <div className="mx-auto w-full max-w-md md:max-w-2xl lg:max-w-3xl xl:max-w-4xl">
        {exercises === null ? null : exercises.length === 0 ? (
          <EmptyState
            icon={<ListChecks className="h-10 w-10" />}
            title="No exercises yet"
            description="Exercises show up here once your plans are set up."
          />
        ) : (
          <div className="grid grid-cols-1 gap-2 px-4 py-4 md:grid-cols-2">
            {exercises.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => navigate(`/exercise/${ex.id}`)}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left hover:bg-muted/50"
              >
                <span className="font-semibold">{ex.name}</span>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { ChevronRight, LayoutGrid, Plus } from 'lucide-react';
import { useRepo } from '@/storage/RepositoryProvider';
import { useObservable } from '@/hooks/useObservable';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/FeelingPicker';
import type { WorkoutTemplate } from '@/types';

export default function Templates() {
  const navigate = useNavigate();
  const repo = useRepo();
  const templates =
    useObservable(() => repo.observeTemplates(), [repo]) ?? ([] as WorkoutTemplate[]);

  return (
    <div>
      <PageHeader
        title="Plans"
        right={
          <button
            type="button"
            aria-label="New plan"
            onClick={() => navigate('/templates/new')}
            className="flex h-11 w-11 items-center justify-center rounded-full text-primary hover:bg-muted"
          >
            <Plus className="h-6 w-6" />
          </button>
        }
      />

      {templates.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid className="h-10 w-10" />}
          title="No plans yet"
          description="Create a workout plan to get started."
          action={
            <Button onClick={() => navigate('/templates/new')}>
              <Plus className="h-4 w-4" />
              New plan
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 px-4 py-4 md:grid-cols-2">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => navigate(`/templates/${t.id}`)}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left hover:bg-muted/50"
            >
              <div>
                <p className="font-semibold">{t.name}</p>
                <p className="text-sm text-muted-foreground">
                  {t.exercises.length} exercises · {t.estimatedMinutes} min
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

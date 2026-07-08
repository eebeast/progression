import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RepositoryProvider } from '@/storage/RepositoryProvider';
import { of, type WorkoutRepository } from '@/storage/repository';
import HistoryPage from '@/pages/History';
import type { Run, WorkoutSession } from '@/types';

const session: WorkoutSession = {
  id: 's1',
  templateId: 'push',
  templateName: 'Push',
  date: Date.UTC(2026, 0, 1),
  startTime: Date.UTC(2026, 0, 1),
  endTime: Date.UTC(2026, 0, 1) + 3_600_000,
  notes: '',
  feeling: null,
  status: 'completed',
};

const run: Run = {
  id: 'r1',
  date: Date.UTC(2026, 0, 3), // newer than the workout
  distanceKm: 5,
  durationSeconds: 1500,
  createdAt: Date.UTC(2026, 0, 3),
};

function renderHistory(over: Partial<WorkoutRepository> = {}) {
  const repo = {
    observeCompletedSessions: () => of([session]),
    observeRuns: () => of([run]),
    updateRun: vi.fn().mockResolvedValue(undefined),
    deleteRun: vi.fn().mockResolvedValue(undefined),
    ...over,
  } as unknown as WorkoutRepository;

  render(
    <MemoryRouter>
      <RepositoryProvider repository={repo}>
        <HistoryPage />
      </RepositoryProvider>
    </MemoryRouter>,
  );
}

describe('History page', () => {
  it('shows an empty state when there are no workouts or runs', () => {
    renderHistory({ observeCompletedSessions: () => of([]), observeRuns: () => of([]) });
    expect(screen.getByText(/nothing logged yet/i)).toBeInTheDocument();
  });

  it('lists both workouts and runs, most recent first', () => {
    renderHistory();
    const cards = screen.getAllByRole('button');
    // Run (Jan 3) is newer than the Push workout (Jan 1), so it comes first.
    expect(within(cards[0]).getByText(/5 km/)).toBeInTheDocument();
    expect(within(cards[1]).getByText('Push')).toBeInTheDocument();
  });
});

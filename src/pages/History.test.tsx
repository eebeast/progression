import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RepositoryProvider } from '@/storage/RepositoryProvider';
import { of, type WorkoutRepository } from '@/storage/repository';
import HistoryPage from '@/pages/History';
import userEvent from '@testing-library/user-event';
import { DEFAULT_SETTINGS } from '@/storage/defaults';
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

function renderHistory(over: Partial<WorkoutRepository> = {}, route = '/history') {
  const repo = {
    observeSettings: () => of(DEFAULT_SETTINGS),
    observeBodyWeights: () => of([]),
    updateBodyWeight: vi.fn().mockResolvedValue(undefined),
    deleteBodyWeight: vi.fn().mockResolvedValue(undefined),
    observeCompletedSessions: () => of([session]),
    observeRuns: () => of([run]),
    updateRun: vi.fn().mockResolvedValue(undefined),
    deleteRun: vi.fn().mockResolvedValue(undefined),
    ...over,
  } as unknown as WorkoutRepository;

  render(
    <MemoryRouter initialEntries={[route]}>
      <RepositoryProvider repository={repo}>
        <HistoryPage />
      </RepositoryProvider>
    </MemoryRouter>,
  );
  return repo;
}

describe('History page', () => {
  it('shows an empty state when there are no workouts or runs', () => {
    renderHistory({ observeCompletedSessions: () => of([]), observeRuns: () => of([]) });
    expect(screen.getByText(/nothing logged yet/i)).toBeInTheDocument();
  });

  it('lists both workouts and runs, most recent first', () => {
    renderHistory();
    const cards = within(screen.getByRole('list', { name: 'Logbook records' })).getAllByRole('button');
    // Run (Jan 3) is newer than the Push workout (Jan 1), so it comes first.
    expect(within(cards[0]).getByText(/5 km/)).toBeInTheDocument();
    expect(within(cards[1]).getByText('Push')).toBeInTheDocument();
  });
});

it('filters exercises, runs, cycles and body weight while keeping weight records editable', async () => {
  const user = userEvent.setup();
  const repo = renderHistory({ observeBodyWeights: () => of([{ id: 'w', date: Date.UTC(2026, 0, 4), createdAt: Date.UTC(2026, 0, 4), weight: 75 }]) });
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
  await user.click(screen.getByRole('button', { name: 'Exercises' }));
  expect(screen.getAllByRole('listitem')).toHaveLength(1); expect(screen.getByText('Push')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Runs' }));
  expect(screen.getAllByRole('listitem')).toHaveLength(1); expect(screen.queryByText('Push')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Cycles' }));
  expect(screen.getByText('No matching records')).toBeVisible();
  expect(screen.getByText(/Cycling entry is not available yet/)).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Body weight' }));
  await user.click(screen.getByRole('button', { name: /75kg/ }));
  await user.clear(screen.getByRole('textbox', { name: 'Weight' })); await user.type(screen.getByRole('textbox', { name: 'Weight' }), '76');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(repo.updateBodyWeight).toHaveBeenCalledWith('w', expect.objectContaining({ weight: 76 }));
});

it('opens calendar-selected dates and can clear the date without changing the type filter', async () => {
  const user = userEvent.setup();
  renderHistory({}, '/history?date=2026-01-03&type=run');
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
  expect(screen.getByText('Records for 2026-01-03')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Show all dates' }));
  expect(screen.getByRole('button', { name: 'Runs' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByText('Records for 2026-01-03')).not.toBeInTheDocument();
});

import { expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RepositoryProvider } from '@/storage/RepositoryProvider';
import { of, type WorkoutRepository } from '@/storage/repository';
import { DEFAULT_SETTINGS } from '@/storage/defaults';
import Analytics from './Analytics';
import type { ExerciseLog, WorkoutSession } from '@/types';

function setup(overrides: Partial<WorkoutRepository> = {}) {
  const now = Date.now();
  const repo = {
    observeSettings: () => of(DEFAULT_SETTINGS),
    observeCompletedSessions: () => of([{ id: 's', templateId: 't', templateName: 'Legs', date: now, status: 'completed' }, { id: 'zero', templateId: 't', templateName: 'Legs', date: now, status: 'completed' }]),
    observeAllLogs: () => of([{ id: 'l', sessionId: 's', exerciseId: 'e', exerciseName: 'Squat', weight: 100, reps: 8, timestamp: now }, { id: 'w', sessionId: 's', exerciseId: 'e', isWarmup: true }]),
    observeExercises: () => of([{ id: 'e', name: 'Squat', primaryMuscle: 'Quads' }]),
    observeTemplates: () => of([{ id: 't', name: 'Legs' }]),
    observeRuns: () => of([{ id: 'r', date: now, distanceKm: 5, durationSeconds: 1500 }]),
    observeBodyWeights: () => of([{ id: 'b2', date: now, weight: 72, createdAt: now }, { id: 'b1', date: now - 1000, weight: 73, createdAt: now - 1000 }]),
    ...overrides,
  } as unknown as WorkoutRepository;
  render(<MemoryRouter><RepositoryProvider repository={repo}><Analytics /></RepositoryProvider></MemoryRouter>);
  return userEvent.setup();
}

it('shows factual cards and applies optional filters only to gym records', async () => {
  const user = setup();
  expect(await screen.findByRole('region', { name: 'Workouts' })).toHaveTextContent('2');
  expect(screen.getByRole('region', { name: 'Categories trained' })).toHaveTextContent('1');
  expect(screen.getByRole('region', { name: 'Running distance' })).toHaveTextContent('5km');
  expect(screen.getByRole('region', { name: 'Latest body weight' })).toHaveTextContent('72kg');
  expect(screen.getByRole('region', { name: 'Running summary' })).toHaveTextContent('5:00 /km');
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Gym filters' }));
  await user.selectOptions(screen.getByLabelText('Muscle group'), 'Legs');
  expect(screen.getByRole('region', { name: 'Workouts' })).toHaveTextContent('1');
  expect(screen.getByRole('region', { name: 'Running distance' })).toHaveTextContent('5km');
  await user.click(screen.getByRole('button', { name: 'Gym filters (1)' }));
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  expect(screen.getByText(/1 gym filter applied/)).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(screen.getByRole('region', { name: 'Workouts' })).toHaveTextContent('2');
});

it('switches chart metrics and set breakdown while keeping recorded values accessible', async () => {
  const user = setup();
  expect(await screen.findByRole('table', { name: 'Workouts recorded values' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Sets' })).not.toBeInTheDocument();
  expect(screen.queryByText('Working sets')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Run km' }));
  expect(screen.getByRole('table', { name: 'Running distance recorded values' })).toHaveTextContent('5 km');
  await user.click(within(screen.getByRole('group', { name: 'Exercise categories' })).getByRole('button', { name: /Legs/ }));
  expect(screen.getByRole('region', { name: 'Legs exercise records' })).toHaveTextContent('Heaviest recorded: 100 kg');
  expect(screen.getByRole('link', { name: 'Squat' })).toHaveAttribute('href', '/exercise/e');
  expect(screen.getByRole('table', { name: 'Set load recorded values' })).toHaveTextContent('100 kg');
  await user.click(within(screen.getByRole('group', { name: 'Exercise categories' })).getByRole('button', { name: /Chest/ }));
  expect(screen.getByRole('region', { name: 'Chest exercise records' })).toHaveTextContent('Push-ups');
  expect(screen.getByRole('region', { name: 'Chest exercise records' })).toHaveTextContent('Bench Press');
  const weightRows = within(screen.getByRole('table', { name: 'Body weight recorded values' })).getAllByRole('row');
  expect(weightRows[1]).toHaveTextContent('73 kg');
  expect(weightRows[2]).toHaveTextContent('72 kg');
});

it('uses clear empty states and validates custom dates before rendering charts', async () => {
  const user = setup({ observeCompletedSessions: () => of([]), observeAllLogs: () => of([]), observeRuns: () => of([]), observeBodyWeights: () => of([]) });
  expect(await screen.findByText('No completed workouts in this period.')).toBeVisible();
  expect(screen.getByText(/No body-weight entries in this period/)).toBeVisible();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Custom' }));
  await user.clear(screen.getByLabelText('From'));
  expect(screen.getByRole('alert')).toHaveTextContent('Choose valid dates');
  expect(screen.queryByRole('region', { name: 'Activity over time' })).not.toBeInTheDocument();
});

it('shows earned streak facts and allows daily mode without changing activity totals', async () => {
  const user = setup();
  const streaks = await screen.findByRole('region', { name: 'Activity streaks' });
  expect(streaks).toHaveTextContent('Current streak1week');
  expect(within(streaks).getByText('Personal best')).toBeVisible();
  expect(streaks).toHaveTextContent('1 active day');
  await user.click(within(streaks).getByRole('button', { name: 'Days' }));
  expect(streaks).toHaveTextContent('Current streak1day');
  expect(screen.getByRole('region', { name: 'Workouts' })).toHaveTextContent('2');
  await user.click(screen.getByRole('button', { name: 'Gym filters' }));
  await user.selectOptions(screen.getByLabelText('Muscle group'), 'Chest');
  expect(screen.getByRole('region', { name: 'Workouts' })).toHaveTextContent('0');
  expect(streaks).toHaveTextContent('Current streak1day');
});

it('shows calendar-year workout totals in twelve monthly chart buckets', async () => {
  const user = setup();
  await user.click(await screen.findByRole('button', { name: 'This year' }));
  expect(screen.getByRole('button', { name: 'This year' })).toHaveAttribute('aria-pressed', 'true');
  expect(within(screen.getByRole('table', { name: 'Workouts recorded values' })).getAllByRole('row')).toHaveLength(13);
});

it('keeps every historical load visible when the dashboard date period changes', async () => {
  const now = Date.now(); const old = now - 400 * 86_400_000;
  const user = setup({
    observeCompletedSessions: () => of([{ id: 'old', date: old, status: 'completed' }, { id: 's', date: now, status: 'completed' }] as WorkoutSession[]),
    observeAllLogs: () => of([
      { id: 'old-1', sessionId: 'old', exerciseId: 'e', exerciseName: 'Squat', weight: 40, reps: 10, setNumber: 1, timestamp: old },
      { id: 'old-2', sessionId: 'old', exerciseId: 'e', exerciseName: 'Squat', weight: 45, reps: 8, setNumber: 2, timestamp: old + 1 },
      { id: 'new', sessionId: 's', exerciseId: 'e', exerciseName: 'Squat', weight: 60, reps: 8, setNumber: 1, timestamp: now },
    ] as ExerciseLog[]),
  });
  await user.click(within(await screen.findByRole('group', { name: 'Exercise categories' })).getByRole('button', { name: /Legs/ }));
  const values = screen.getByRole('table', { name: 'Set load recorded values' });
  expect(within(values).getAllByRole('row')).toHaveLength(4);
  expect(values).toHaveTextContent('40 kg'); expect(values).toHaveTextContent('45 kg'); expect(values).toHaveTextContent('60 kg');
  await user.click(screen.getByRole('button', { name: 'This year' }));
  expect(within(screen.getByRole('table', { name: 'Set load recorded values' })).getAllByRole('row')).toHaveLength(4);
  expect(screen.queryByText('Unspecified')).not.toBeInTheDocument();
});

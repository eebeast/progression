import { expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RepositoryProvider } from '@/storage/RepositoryProvider';
import { of, type WorkoutRepository } from '@/storage/repository';
import { DEFAULT_SETTINGS } from '@/storage/defaults';
import Activity from './Activity';

it('combines charts, calendar and history without add forms or duplicate streak summaries', async () => {
  const now = Date.now();
  const repo = {
    observeSettings: () => of(DEFAULT_SETTINGS),
    observeCompletedSessions: () => of([]), observeAllLogs: () => of([]), observeExercises: () => of([]), observeTemplates: () => of([]),
    observeRuns: () => of([{ id: 'r', date: now, distanceKm: 5, durationSeconds: 1500, createdAt: now }]),
    observeBodyWeights: () => of([{ id: 'w', date: now, weight: 75, createdAt: now }]),
    updateBodyWeight: vi.fn().mockResolvedValue(undefined), deleteBodyWeight: vi.fn().mockResolvedValue(undefined),
  } as unknown as WorkoutRepository;
  render(<MemoryRouter><RepositoryProvider repository={repo}><Activity /></RepositoryProvider></MemoryRouter>);
  expect(await screen.findByRole('region', { name: 'Activity over time' })).toBeInTheDocument();
  expect(screen.getAllByRole('region', { name: 'Activity streaks' })).toHaveLength(1);
  expect(screen.getByRole('region', { name: 'Activity calendar' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Recent runs' })).toHaveTextContent(/5\s*km/);
  expect(screen.queryByText('View activity overview')).not.toBeInTheDocument();
  for (const name of ['Log run', 'Add run', 'Add entry', 'Add weight']) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Add a run or body weight on Today' })).toHaveAttribute('href', '/');
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /75kg/ }));
  await user.clear(screen.getByRole('textbox', { name: 'Weight' }));
  await user.type(screen.getByRole('textbox', { name: 'Weight' }), '76');
  await user.click(screen.getByRole('button', { name: 'Custom' }));
  await user.clear(screen.getByLabelText('From'));
  expect(screen.getByRole('alert')).toHaveTextContent('Choose valid dates');
  expect(screen.getByRole('region', { name: 'Activity calendar' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Weight' })).toHaveValue('76');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(repo.updateBodyWeight).toHaveBeenCalledWith('w', expect.objectContaining({ weight: 76 }));
  expect(within(screen.getByRole('region', { name: 'Recent runs' })).getByText(/5 km/)).toBeInTheDocument();
});

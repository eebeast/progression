import { expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RepositoryProvider } from '@/storage/RepositoryProvider';
import { of, type WorkoutRepository } from '@/storage/repository';
import { DEFAULT_SETTINGS } from '@/storage/defaults';
import Activity from './Activity';
import { dateKey } from '@/utils/activity';

it('keeps charts, a separate streak card and calendar without run or weight record lists', async () => {
  const now = Date.now();
  const repo = {
    observeSettings: () => of(DEFAULT_SETTINGS),
    observeCompletedSessions: () => of([]), observeAllLogs: () => of([]), observeExercises: () => of([]), observeTemplates: () => of([]),
    observeRuns: () => of([{ id: 'r', date: now, distanceKm: 5, durationSeconds: 1500, createdAt: now }]),
    observeBodyWeights: () => of([{ id: 'w', date: now, weight: 75, createdAt: now }]),
  } as unknown as WorkoutRepository;
  render(<MemoryRouter><RepositoryProvider repository={repo}><Activity /></RepositoryProvider></MemoryRouter>);
  expect(await screen.findByRole('region', { name: 'Activity over time' })).toBeInTheDocument();
  const streaks = screen.getByRole('region', { name: 'Activity streaks' });
  const calendar = screen.getByRole('region', { name: 'Activity calendar' });
  expect(streaks).toBeInTheDocument();
  expect(calendar).toBeInTheDocument();
  expect(within(streaks).queryByRole('region', { name: 'Activity calendar' })).not.toBeInTheDocument();
  expect(within(calendar).getByRole('link', { name: 'View records' })).toHaveAttribute('href', `/history?date=${dateKey(now)}`);
  expect(screen.queryByRole('region', { name: 'Recent runs' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /75kg/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Latest body weight' })).not.toBeInTheDocument();
  expect(screen.getByRole('table', { name: 'Body weight recorded values' })).toHaveTextContent('75 kg');
  expect(screen.getByRole('link', { name: 'Open Logbook' })).toHaveAttribute('href', '/history');
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Custom' }));
  await user.clear(screen.getByLabelText('From'));
  expect(screen.getByRole('region', { name: 'Activity calendar' })).toBeInTheDocument();
});

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RepositoryProvider } from '@/storage/RepositoryProvider';
import { of, type WorkoutRepository } from '@/storage/repository';
import { DEFAULT_SETTINGS } from '@/storage/defaults';
import Analytics from './Analytics';

it('shows factual period totals and applies muscle filters only to gym records', async () => {
  const now = Date.now();
  const repo = {
    observeSettings: () => of(DEFAULT_SETTINGS),
    observeCompletedSessions: () => of([{ id: 's', templateId: 't', templateName: 'Legs', date: now, status: 'completed' }, { id: 'zero', templateId: 't', templateName: 'Legs', date: now, status: 'completed' }]),
    observeAllLogs: () => of([{ id: 'l', sessionId: 's', exerciseId: 'e', exerciseName: 'Squat' }, { id: 'w', sessionId: 's', exerciseId: 'e', isWarmup: true }]),
    observeExercises: () => of([{ id: 'e', name: 'Squat', primaryMuscle: 'Quads' }]),
    observeTemplates: () => of([{ id: 't', name: 'Legs' }]),
    observeRuns: () => of([{ id: 'r', date: now, distanceKm: 5, durationSeconds: 1500 }]),
    observeBodyWeights: () => of([]),
  } as unknown as WorkoutRepository;
  render(<MemoryRouter><RepositoryProvider repository={repo}><Analytics /></RepositoryProvider></MemoryRouter>);
  expect(await screen.findByText('2 completed workouts')).toBeInTheDocument();
  expect(screen.getByText('1 working sets')).toBeInTheDocument();
  expect(screen.getByText('Pace: 5:00 /km')).toBeInTheDocument();
  await userEvent.setup().selectOptions(screen.getByLabelText('Primary muscle'), 'Quads');
  expect(screen.getByText('1 completed workouts')).toBeInTheDocument();
  expect(screen.getByText('1 runs · 5.00 km')).toBeInTheDocument();
});

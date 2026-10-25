import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RepositoryProvider } from '@/storage/RepositoryProvider';
import { of, type LastPerformed, type Observable, type Observer, type WorkoutRepository } from '@/storage/repository';
import { DEFAULT_SETTINGS } from '@/storage/defaults';
import type { TemplateExercise, WorkoutSession, WorkoutTemplate } from '@/types';
import Workout from './Workout';

const exercises: TemplateExercise[] = [{ exerciseId: 'e1', name: 'Original squat', targetSets: 3, targetRepRange: '8-12', order: 0 }];
const session: WorkoutSession = {
  id: 's1', templateId: 't1', templateName: 'Original plan', exercises,
  date: 1, startTime: 1, endTime: null, notes: '', feeling: null, status: 'active',
};

function showWorkout(value: WorkoutSession, template?: WorkoutTemplate, stream?: Observable<WorkoutTemplate | undefined>, overrides: Partial<WorkoutRepository> = {}) {
  const observeTemplate = vi.fn(() => stream ?? of(template));
  const repo = {
    observeSettings: () => of(DEFAULT_SETTINGS),
    observeSession: () => of(value),
    observeSessionLogs: () => of([]),
    observeExercises: () => of([]),
    observeExerciseLogs: () => of([]),
    getLastPerformedSets: () => Promise.resolve(null),
    observeTemplate,
    ...overrides,
  } as unknown as WorkoutRepository;
  render(<MemoryRouter initialEntries={['/workout/s1']}>
    <RepositoryProvider repository={repo}>
      <Routes><Route path="/workout/:sessionId" element={<Workout />} /></Routes>
    </RepositoryProvider>
  </MemoryRouter>);
  return observeTemplate;
}

describe('Workout prescriptions', () => {
  it('waits for a legacy plan read before displaying the exercise list', async () => {
    let observer: Observer<WorkoutTemplate | undefined> | undefined;
    showWorkout({ ...session, exercises: undefined }, undefined, {
      subscribe(value) { observer = value; return { unsubscribe() {} }; },
    });
    expect(screen.queryByText('This plan has no exercises.')).not.toBeInTheDocument();
    act(() => observer?.next({ id: 't1', name: 'Plan', exercises, order: 0, estimatedMinutes: 30, createdAt: 0, updatedAt: 0 }));
    expect(await screen.findByText('Original squat')).toBeInTheDocument();
  });

  it('shows the session snapshot even when the source plan was deleted', async () => {
    const observeTemplate = showWorkout(session);
    expect(await screen.findByText('Original squat')).toBeInTheDocument();
    expect(screen.getByText('Original plan')).toBeInTheDocument();
    expect(screen.getByText('3 sets · 8-12 reps')).toBeInTheDocument();
    expect(observeTemplate).not.toHaveBeenCalled();
  });

  it('keeps the workout focused on planned exercises without add-exercise or timer controls', async () => {
    showWorkout({ ...session, restEndsAt: Date.now() + 60_000,
      exercises: exercises.map((exercise) => ({ ...exercise, restSeconds: 60 })),
    });
    expect(await screen.findByText('Original squat')).toBeVisible();
    expect(screen.queryByText('Add exercise to this workout')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Exercise name' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add to workout' })).not.toBeInTheDocument();
    expect(screen.queryByText('Rest timer')).not.toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start timer' })).not.toBeInTheDocument();
  });

  it('keeps an intentionally empty session snapshot instead of loading changed plan exercises', async () => {
    const observeTemplate = showWorkout({ ...session, exercises: [] });
    expect(await screen.findByText('This plan has no exercises.')).toBeInTheDocument();
    expect(observeTemplate).not.toHaveBeenCalled();
  });

  it('uses the source plan for legacy sessions without a snapshot', async () => {
    const observeTemplate = showWorkout({ ...session, exercises: undefined }, {
      id: 't1', name: 'Plan now', exercises, order: 0, estimatedMinutes: 30, createdAt: 0, updatedAt: 0,
    });
    expect(await screen.findByText('Original squat')).toBeInTheDocument();
    expect(observeTemplate).toHaveBeenCalledWith('t1');
  });
});

it('prevents double saves and keeps entry values available after a failed local save', async () => {
  const user = userEvent.setup(); let fail: ((error: Error) => void) | undefined;
  const addSet = vi.fn(() => new Promise<void>((_resolve, reject) => { fail = reject; }));
  showWorkout(session, undefined, undefined, { addSet });
  await user.click(await screen.findByRole('button', { name: 'Start exercise' }));
  await user.click(screen.getByRole('button', { name: 'Increase Reps' }));
  await user.dblClick(screen.getByRole('button', { name: 'Save set' }));
  expect(addSet).toHaveBeenCalledTimes(1);
  await act(async () => { fail!(new Error('Storage full')); });
  expect(screen.getByRole('alert')).toHaveTextContent('Storage full');
  expect(screen.getByRole('button', { name: 'Save set' })).toBeEnabled();
  expect(screen.getByRole('textbox', { name: 'Reps' })).toHaveValue('1');
});

it('prefills compatible alias history and never carries it into another exercise while its read is pending', async () => {
  const user = userEvent.setup();
  let resolveNext!: (value: LastPerformed | null) => void;
  const previous: LastPerformed = {
    session: { ...session, id: 'previous', status: 'completed' },
    sets: [{ id: 'old-set', exerciseId: 'old-bench', exerciseName: 'Bench Press', sessionId: 'previous', weight: 50, reps: 8, setNumber: 1, timestamp: 1 }],
  };
  const getLastPerformedSets = vi.fn((id: string) => id === 'current-bench'
    ? Promise.resolve(previous)
    : new Promise<LastPerformed | null>((resolve) => { resolveNext = resolve; }));
  showWorkout({ ...session, exercises: [
    { ...exercises[0], exerciseId: 'current-bench', name: 'Barbell Bench Press' },
    { ...exercises[0], exerciseId: 'row', name: 'Barbell Row', order: 1 },
  ] }, undefined, undefined, { getLastPerformedSets });
  await screen.findByText('50kg × 8');
  await user.click(screen.getByRole('button', { name: 'Start exercise' }));
  expect(screen.getByRole('textbox', { name: 'Weight' })).toHaveValue('50');
  expect(screen.getByRole('textbox', { name: 'Reps' })).toHaveValue('8');
  await user.click(screen.getAllByRole('button', { name: 'Next exercise' })[0]);
  await user.click(screen.getByRole('button', { name: 'Start exercise' }));
  expect(screen.getByRole('textbox', { name: 'Weight' })).toHaveValue('0');
  expect(screen.queryByText('50kg × 8')).not.toBeInTheDocument();
  // Both movements came from the same prior session; its ID cannot identify the response.
  await act(async () => { resolveNext({ ...previous, sets: [{ ...previous.sets[0], id: 'row-set', exerciseId: 'row', exerciseName: 'Barbell Row', weight: 30, reps: 12 }] }); });
  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Weight' })).toHaveValue('30'));
  expect(screen.getByRole('textbox', { name: 'Reps' })).toHaveValue('12');
});

it('does not prefill timed alias history into a reps assignment', async () => {
  const user = userEvent.setup();
  showWorkout(session, undefined, undefined, {
    getLastPerformedSets: async () => ({
      session: { ...session, id: 'previous', status: 'completed' },
      sets: [{ id: 'timed', exerciseId: 'legacy', exerciseName: 'Original squat', sessionId: 'previous', weight: 20, reps: 60, metric: 'time', setNumber: 1, timestamp: 1 }],
    }),
  });
  await screen.findByText('20kg × 1m');
  await user.click(screen.getByRole('button', { name: 'Start exercise' }));
  expect(screen.getByRole('textbox', { name: 'Weight' })).toHaveValue('0');
  expect(screen.getByRole('textbox', { name: 'Reps' })).toHaveValue('0');
});

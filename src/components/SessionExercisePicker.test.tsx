import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionExercisePicker } from './SessionExercisePicker';
import { RepositoryProvider } from '@/storage/RepositoryProvider';
import { of, type WorkoutRepository } from '@/storage/repository';

function setup() {
  const repo = {
    observeExercises: () => of([{ id: 'squat', name: 'Squat', createdAt: 0 }]),
    createExercise: vi.fn().mockResolvedValue('new-exercise'),
    addSessionExercise: vi.fn().mockResolvedValue(undefined),
  };
  const onAdded = vi.fn();
  const view = render(<RepositoryProvider repository={repo as unknown as WorkoutRepository}>
    <SessionExercisePicker sessionId="session" onAdded={onAdded} />
  </RepositoryProvider>);
  return { ...view, repo, onAdded, user: userEvent.setup() };
}

it('uses plain name entry and reuses an exact existing exercise', async () => {
  const { container, repo, onAdded, user } = setup();
  expect(screen.getByRole('textbox', { name: 'Exercise name' })).toBeVisible();
  expect(container.querySelector('details, summary, select, datalist, input[list]')).toBeNull();
  await user.type(screen.getByRole('textbox', { name: 'Exercise name' }), 'Squat');
  await user.click(screen.getByRole('button', { name: 'Add to workout' }));
  expect(repo.createExercise).not.toHaveBeenCalled();
  expect(repo.addSessionExercise).toHaveBeenCalledWith('session', expect.objectContaining({ exerciseId: 'squat', name: 'Squat', metric: 'reps' }));
  expect(onAdded).toHaveBeenCalledOnce();
});

it('keeps a newly created identity when saving to the workout fails', async () => {
  const { repo, user } = setup();
  repo.addSessionExercise.mockRejectedValueOnce(new Error('Save failed'));
  await user.type(screen.getByRole('textbox', { name: 'Exercise name' }), 'Plank');
  await user.click(screen.getByRole('button', { name: 'Time' }));
  await user.click(screen.getByRole('button', { name: 'Add to workout' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Save failed');
  await user.click(screen.getByRole('button', { name: 'Add to workout' }));
  expect(repo.createExercise).toHaveBeenCalledOnce();
  expect(repo.addSessionExercise).toHaveBeenLastCalledWith('session', expect.objectContaining({ exerciseId: 'new-exercise', name: 'Plank', metric: 'time' }));
});

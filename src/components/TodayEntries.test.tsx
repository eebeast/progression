import { expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RepositoryProvider } from '@/storage/RepositoryProvider';
import { of, type WorkoutRepository } from '@/storage/repository';
import { DEFAULT_SETTINGS } from '@/storage/defaults';
import { TodayEntries } from './TodayEntries';

function setup() {
  const repo = {
    observeSettings: () => of(DEFAULT_SETTINGS),
    observeBodyWeights: () => of([{ id: 'old', date: 1, createdAt: 1, weight: 70 }, { id: 'latest', date: Date.now(), createdAt: Date.now(), weight: 75 }]),
    createRun: vi.fn().mockResolvedValue('run'), addBodyWeight: vi.fn().mockResolvedValue('weight'),
  };
  render(<RepositoryProvider repository={repo as unknown as WorkoutRepository}><TodayEntries /></RepositoryProvider>);
  return { repo, user: userEvent.setup() };
}

it('saves a run and body weight directly from Today', async () => {
  const { repo, user } = setup();
  await user.click(screen.getByRole('button', { name: 'Add run' }));
  await user.type(screen.getByLabelText('Distance (km)'), '5');
  await user.type(screen.getByLabelText('Minutes'), '25');
  await user.type(screen.getByLabelText('Seconds'), '30');
  await user.click(screen.getByRole('button', { name: 'Save run' }));
  expect(repo.createRun).toHaveBeenCalledWith({ date: expect.any(Number), distanceKm: 5, durationSeconds: 1530 });
  expect(await screen.findByRole('status')).toHaveTextContent('Run saved');
  await user.click(screen.getByRole('button', { name: 'Add weight' }));
  expect(screen.getByRole('textbox', { name: 'Weight' })).toHaveValue('75');
  await user.clear(screen.getByRole('textbox', { name: 'Weight' }));
  await user.type(screen.getByRole('textbox', { name: 'Weight' }), '74.5');
  await user.click(screen.getByRole('button', { name: 'Save weight' }));
  expect(repo.addBodyWeight).toHaveBeenCalledWith({ date: expect.any(Number), weight: 74.5 });
  expect(await screen.findByRole('status')).toHaveTextContent('Body weight saved');
});

it('keeps a failed run entry available and retries without losing fields', async () => {
  const { repo, user } = setup(); repo.createRun.mockRejectedValueOnce(new Error('Storage full'));
  await user.click(screen.getByRole('button', { name: 'Add run' }));
  await user.type(screen.getByLabelText('Distance (km)'), '3');
  await user.type(screen.getByLabelText('Minutes'), '20');
  await user.click(screen.getByRole('button', { name: 'Save run' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Storage full');
  expect(screen.getByLabelText('Distance (km)')).toHaveValue('3');
  await user.click(screen.getByRole('button', { name: 'Save run' }));
  expect(repo.createRun).toHaveBeenCalledTimes(2);
  expect(await screen.findByRole('status')).toHaveTextContent('Run saved');
});

it('prevents repeated weight saves and retains the form when persistence fails', async () => {
  const { repo, user } = setup(); let rejectSave: (reason: Error) => void = () => {};
  repo.addBodyWeight.mockImplementation(() => new Promise((_resolve, reject) => { rejectSave = reject; }));
  await user.click(screen.getByRole('button', { name: 'Add weight' }));
  await user.dblClick(screen.getByRole('button', { name: 'Save weight' }));
  expect(repo.addBodyWeight).toHaveBeenCalledOnce();
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  await act(async () => rejectSave(new Error('Could not save')));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save');
  expect(screen.getByRole('textbox', { name: 'Weight' })).toHaveValue('75');
});

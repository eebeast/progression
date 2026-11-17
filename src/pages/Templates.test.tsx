import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RepositoryProvider } from '@/storage/RepositoryProvider';
import { of, type WorkoutRepository } from '@/storage/repository';
import Templates from './Templates';
import type { WorkoutTemplate } from '@/types';

const plan = { name: 'Workout A', exercises: [{ name: 'Dead bug (optional)', targetSets: 2, targetRepRange: '8 each side' }] };
const contents = JSON.stringify({ app: 'progression-plans', version: 1, plans: [plan] });
const existing: WorkoutTemplate = { id: 'existing', name: 'Workout A', order: 0, estimatedMinutes: 30, exercises: [], createdAt: 0, updatedAt: 0 };

function setup(templates: WorkoutTemplate[] = [existing], importPlans = vi.fn().mockResolvedValue(undefined)) {
  const repo = { observeTemplates: () => of(templates), importPlans } as unknown as WorkoutRepository;
  render(<MemoryRouter><RepositoryProvider repository={repo}><Templates /></RepositoryProvider></MemoryRouter>);
  return { user: userEvent.setup(), importPlans };
}

function planFile(text = contents) {
  const file = new File([text], 'plans.json', { type: 'application/json' });
  // jsdom's File lacks Blob.text().
  Object.defineProperty(file, 'text', { value: () => Promise.resolve(text) });
  return file;
}

afterEach(() => vi.restoreAllMocks());

describe('Plans import/export', () => {
  it('previews instructions and duplicate notice before adding copies', async () => {
    const { user, importPlans } = setup();
    await user.upload(screen.getByLabelText('Choose plans file'), planFile());
    expect(await screen.findByRole('heading', { name: 'Plans to add' })).toBeInTheDocument();
    expect(screen.getByText(/Dead bug \(optional\) — 2 × 8 each side/)).toBeInTheDocument();
    expect(screen.getByText(/A separate copy will be added/)).toBeInTheDocument();
    expect(importPlans).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Add 1 plan' }));
    expect(importPlans).toHaveBeenCalledWith([{ ...plan, estimatedMinutes: undefined, exercises: [{ ...plan.exercises[0], metric: 'reps' }] }]);
    expect(await screen.findByRole('status')).toHaveTextContent('Added 1 plan.');
  });

  it('allows import on an empty Plans page and cancellation without writing', async () => {
    const { user, importPlans } = setup([]);
    expect(screen.getByRole('button', { name: 'Export all plans' })).toBeDisabled();
    await user.upload(screen.getByLabelText('Choose plans file'), planFile());
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('heading', { name: 'Plans to add' })).not.toBeInTheDocument();
    expect(importPlans).not.toHaveBeenCalled();
  });

  it('rejects a full backup without writing and lets the same file be selected again', async () => {
    const { user, importPlans } = setup();
    const file = planFile('{"app":"workout-tracker","data":{}}');
    await user.upload(screen.getByLabelText('Choose plans file'), file);
    expect(await screen.findByRole('alert')).toHaveTextContent(/not a full backup/);
    expect(importPlans).not.toHaveBeenCalled();
    await user.upload(screen.getByLabelText('Choose plans file'), planFile());
    expect(await screen.findByRole('button', { name: 'Add 1 plan' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a failed import and keeps the preview for retry', async () => {
    const { user, importPlans } = setup([], vi.fn().mockRejectedValueOnce(new Error('storage full')).mockResolvedValue(undefined));
    await user.upload(screen.getByLabelText('Choose plans file'), planFile());
    await user.click(await screen.findByRole('button', { name: 'Add 1 plan' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not add plans');
    await user.click(screen.getByRole('button', { name: 'Add 1 plan' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Added 1 plan.');
    expect(importPlans).toHaveBeenCalledTimes(2);
  });

  it('exports a single plan through its download button', async () => {
    const create = vi.fn().mockReturnValue('blob:plans');
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: create });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Export Workout A' }));
    expect(create).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledOnce();
  });
});

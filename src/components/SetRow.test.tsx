import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ExerciseLog } from '@/types';
import { SetRow } from '@/components/SetRow';

function makeLog(over: Partial<ExerciseLog> = {}): ExerciseLog {
  return {
    id: 'l1',
    sessionId: 's1',
    exerciseId: 'e1',
    exerciseName: 'Bench',
    setNumber: 1,
    weight: 100,
    reps: 5,
    timestamp: 1,
    ...over,
  };
}

function renderRow(over: Partial<ExerciseLog> = {}, props: Partial<React.ComponentProps<typeof SetRow>> = {}) {
  const onSave = vi.fn();
  const onDelete = vi.fn();
  render(
    <SetRow
      log={makeLog(over)}
      unit="kg"
      weightIncrement={2.5}
      displayNumber={3}
      onSave={onSave}
      onDelete={onDelete}
      {...props}
    />,
  );
  return { onSave, onDelete };
}

describe('SetRow (collapsed)', () => {
  it('shows the working-set number and the weight × reps', () => {
    renderRow();
    expect(screen.getByRole('button')).toHaveTextContent('3');
    expect(screen.getByRole('button')).toHaveTextContent('100kg × 5');
  });

  it('shows a "W" instead of a number for warm-up sets', () => {
    renderRow({ isWarmup: true });
    expect(screen.getByRole('button')).toHaveTextContent('W');
    expect(screen.queryByText('3')).toBeNull();
  });

  it('shows a New PR badge when isPR', () => {
    renderRow({}, { isPR: true });
    expect(screen.getByRole('button')).toHaveTextContent(/New PR/);
  });

  it('renders time-metric sets via formatSetValue', () => {
    renderRow({ metric: 'time', reps: 90 });
    expect(screen.getByRole('button')).toHaveTextContent('1m 30s');
  });
});

describe('SetRow (editing)', () => {
  it('saves weight, reps, and warm-up state', async () => {
    const user = userEvent.setup();
    const { onSave } = renderRow();

    await user.click(screen.getByRole('button')); // enter edit mode
    expect(screen.getByText('Set 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^save$/i }));
    expect(onSave).toHaveBeenCalledWith({ weight: 100, reps: 5, isWarmup: false });
  });

  it('can tag an existing set as a warm-up while editing', async () => {
    const user = userEvent.setup();
    const { onSave } = renderRow();

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('button', { name: /warm-up/i }));
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    expect(onSave).toHaveBeenCalledWith({ weight: 100, reps: 5, isWarmup: true });
  });

  it('deletes the set', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderRow();

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('button', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('offers a Time stepper for time-metric sets', async () => {
    const user = userEvent.setup();
    renderRow({ metric: 'time', reps: 60 });

    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Time')).toBeInTheDocument();
    expect(screen.queryByText('Reps')).toBeNull();
  });
});

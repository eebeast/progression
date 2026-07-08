import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Stepper } from '@/components/Stepper';

describe('Stepper', () => {
  it('renders its label and current value', () => {
    render(<Stepper label="Reps" value={5} onChange={() => {}} />);
    expect(screen.getByText('Reps')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('5');
  });

  it('increments by the step when + is pressed', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Stepper label="Weight" value={100} onChange={onChange} step={2.5} decimal />);

    await user.click(screen.getByRole('button', { name: /increase weight/i }));
    expect(onChange).toHaveBeenCalledWith(102.5);
  });

  it('decrements by the step but clamps at min', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Stepper label="Reps" value={0} onChange={onChange} step={1} min={0} />);

    await user.click(screen.getByRole('button', { name: /decrease reps/i }));
    expect(onChange).toHaveBeenCalledWith(0); // clamped, not -1
  });

  it('commits a typed value on blur', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Stepper label="Reps" value={5} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '12');
    await user.tab(); // blur

    expect(onChange).toHaveBeenLastCalledWith(12);
  });

  it('clamps a typed value above max', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Stepper label="Reps" value={5} onChange={onChange} max={20} />);

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '99');
    await user.tab();

    expect(onChange).toHaveBeenLastCalledWith(20);
  });
});

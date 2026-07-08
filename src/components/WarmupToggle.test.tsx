import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WarmupToggle } from '@/components/WarmupToggle';

describe('WarmupToggle', () => {
  it('reflects its pressed state via aria-pressed', () => {
    const { rerender } = render(<WarmupToggle value={false} onChange={() => {}} />);
    const toggle = screen.getByRole('button', { name: /warm-up/i });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    rerender(<WarmupToggle value onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /warm-up/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggles the value when clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<WarmupToggle value={false} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /warm-up/i }));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

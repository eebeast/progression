import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Feeling } from '@/types';
import { FeelingPicker } from '@/components/FeelingPicker';

describe('FeelingPicker', () => {
  it('renders the three feeling options', () => {
    render(<FeelingPicker value={null} onChange={() => {}} />);
    for (const label of ['Good', 'OK', 'Rough']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it.each<[Feeling, string]>([
    ['good', 'Good'],
    ['ok', 'OK'],
    ['rough', 'Rough'],
  ])('reports "%s" when %s is chosen', async (value, label) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FeelingPicker value={null} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: label }));
    expect(onChange).toHaveBeenCalledWith(value);
  });

  it('marks the active option as pressed', () => {
    render(<FeelingPicker value="ok" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'OK' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Good' })).toHaveAttribute('aria-pressed', 'false');
  });
});

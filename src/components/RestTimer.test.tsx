import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { RestTimer } from './RestTimer';

afterEach(() => vi.useRealTimers());
describe('rest timer', () => {
  it('uses the persisted deadline after remount and catches up when time advances', () => {
    vi.useFakeTimers(); vi.setSystemTime(1000);
    const props = { endsAt: 61000, onChange: vi.fn().mockResolvedValue(undefined) };
    const view = render(<RestTimer {...props} />);
    expect(screen.getByRole('timer')).toHaveTextContent('1:00 remaining');
    view.unmount(); vi.setSystemTime(31000);
    render(<RestTimer {...props} />);
    expect(screen.getByRole('timer')).toHaveTextContent('0:30 remaining');
    act(() => { vi.advanceTimersByTime(31000); });
    expect(screen.getByRole('timer')).toHaveTextContent('Rest timer finished');
  });
});

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExerciseProgressChart } from '@/components/ExerciseProgressChart';
import type { SessionPoint } from '@/utils/personalRecords';

const point = (over: Partial<SessionPoint>): SessionPoint => ({
  sessionId: 's',
  date: 0,
  topWeight: 100,
  topReps: 5,
  workingSets: 3,
  ...over,
});

describe('ExerciseProgressChart', () => {
  it('shows a quiet message with fewer than two points', () => {
    render(<ExerciseProgressChart points={[point({ sessionId: 'a' })]} unit="kg" />);
    expect(screen.getByText('Not enough data yet')).toBeInTheDocument();
  });

  it('renders the metric toggle with weight selected by default', () => {
    render(
      <ExerciseProgressChart
        points={[point({ sessionId: 'a', date: 1 }), point({ sessionId: 'b', date: 2 })]}
        unit="kg"
      />,
    );
    expect(screen.getByRole('button', { name: 'Top set weight' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Total working sets' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('switches the selected metric when the other pill is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ExerciseProgressChart
        points={[point({ sessionId: 'a', date: 1 }), point({ sessionId: 'b', date: 2 })]}
        unit="kg"
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Total working sets' }));
    expect(screen.getByRole('button', { name: 'Total working sets' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

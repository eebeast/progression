import { expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BmiSummary } from './BmiSummary';

const weights = [{ id: 'w', date: Date.now(), weight: 80, createdAt: Date.now() }];

it('shows the category and risk context, updating when height or weight changes', () => {
  const { rerender } = render(<MemoryRouter><BmiSummary heightCm={200} weights={weights} unit="kg" /></MemoryRouter>);
  expect(screen.getByRole('region', { name: 'Adult BMI' })).toHaveTextContent('20.0');
  expect(screen.getByText('Healthy weight')).toBeVisible();
  expect(screen.queryByText(/increased health risk/)).not.toBeInTheDocument();
  rerender(<MemoryRouter><BmiSummary heightCm={160} weights={weights} unit="kg" /></MemoryRouter>);
  expect(screen.getByText('Obesity')).toBeVisible();
  expect(screen.getByText(/increased health risk/)).toBeVisible();
  expect(screen.getByText(/cannot distinguish muscle from fat/)).toBeVisible();
  rerender(<MemoryRouter><BmiSummary heightCm={160} weights={[]} unit="kg" /></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'Log a valid body weight in Today' })).toHaveAttribute('href', '/');
  expect(screen.queryByText('Obesity')).not.toBeInTheDocument();
});

it('links to height settings when height is missing instead of showing a result', () => {
  render(<MemoryRouter><BmiSummary weights={weights} unit="kg" /></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'Add your height in Settings' })).toHaveAttribute('href', '/settings');
  expect(screen.queryByText('Healthy weight')).not.toBeInTheDocument();
});

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { RepositoryProvider } from '@/storage/RepositoryProvider';
import { of, type WorkoutRepository } from '@/storage/repository';
import Exercises from '@/pages/Exercises';
import type { Exercise } from '@/types';

const exercises: Exercise[] = [
  { id: 'squat', name: 'Squat', createdAt: 0 },
  { id: 'bench', name: 'Bench Press', createdAt: 0 },
];

function ExerciseStub() {
  const { exerciseId } = useParams();
  return <div>exercise page: {exerciseId}</div>;
}

function renderPage() {
  const repo = {
    createExercise: vi.fn().mockResolvedValue('custom'),
    listExercises: vi.fn().mockResolvedValue(exercises),
    observeExercises: () => of(exercises),
  } as unknown as WorkoutRepository;

  render(
    <MemoryRouter initialEntries={['/exercises']}>
      <RepositoryProvider repository={repo}>
        <Routes>
          <Route path="/exercises" element={<Exercises />} />
          <Route path="/exercise/:exerciseId" element={<ExerciseStub />} />
        </Routes>
      </RepositoryProvider>
    </MemoryRouter>,
  );
  return repo;
}

describe('Exercises page', () => {
  it('lists exercises A-Z', async () => {
    renderPage();
    // Bench Press sorts before Squat.
    const buttons = (await screen.findAllByRole('button')).filter((button) => button.textContent?.includes('Press') || button.textContent === 'Squat');
    expect(buttons[0]).toHaveTextContent('Bench Press');
    expect(buttons[1]).toHaveTextContent('Squat');
  });

  it('opens an exercise when tapped', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: /squat/i }));
    expect(screen.getByText('exercise page: squat')).toBeInTheDocument();
  });

  it('asks for a category before creating a custom exercise', async () => {
    const user = userEvent.setup(); const repo = renderPage();
    await user.click(screen.getByText('Manage exercise library'));
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'My movement');
    expect(screen.getByRole('button', { name: 'Create exercise' })).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: 'Compound' }));
    await user.click(screen.getByRole('button', { name: 'Create exercise' }));
    expect(repo.createExercise).toHaveBeenCalledWith(expect.objectContaining({ name: 'My movement', category: 'Compound' }));
  });
});

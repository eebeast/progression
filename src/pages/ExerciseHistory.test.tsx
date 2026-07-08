import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RepositoryProvider } from '@/storage/RepositoryProvider';
import { of, type WorkoutRepository } from '@/storage/repository';
import ExerciseHistory from '@/pages/ExerciseHistory';
import type { ExerciseLog, Settings, WorkoutSession } from '@/types';

const settings: Settings = {
  id: 'singleton',
  userName: 'Pat',
  unit: 'kg',
  theme: 'system',
  accent: 'blue',
  weightIncrement: 2.5,
  weeklyGoal: 4,
};

const session: WorkoutSession = {
  id: 'legs1',
  templateId: 'legs',
  templateName: 'Legs',
  date: Date.UTC(2026, 6, 8),
  startTime: 0,
  endTime: 1,
  notes: '',
  feeling: null,
  status: 'completed',
};

function log(id: string, weight: number, reps: number): ExerciseLog {
  return {
    id,
    sessionId: 'legs1',
    exerciseId: 'squat',
    exerciseName: 'Squat',
    setNumber: 1,
    weight,
    reps,
    timestamp: 1,
  };
}

const logs = [log('l1', 10, 12), log('l2', 20, 12), log('l3', 20, 12)];

function renderPage() {
  const repo = {
    observeSettings: () => of(settings),
    observeExerciseLogs: () => of(logs),
    observeCompletedSessions: () => of([session]),
  } as unknown as WorkoutRepository;

  render(
    <MemoryRouter initialEntries={['/exercise/squat']}>
      <RepositoryProvider repository={repo}>
        <Routes>
          <Route path="/exercise/:exerciseId" element={<ExerciseHistory />} />
        </Routes>
      </RepositoryProvider>
    </MemoryRouter>,
  );
}

describe('ExerciseHistory (top sets)', () => {
  it('shows the personal record and a dated top-sets list', () => {
    renderPage();
    expect(screen.getByText(/personal record/i)).toBeInTheDocument();
    expect(screen.getByText(/top sets/i)).toBeInTheDocument();
    // 20×12 is the PR (dedup keeps one top-set row); 10×12 is the second top set.
    expect(screen.getAllByText(/20kg × 12/).length).toBeGreaterThanOrEqual(2); // PR card + top set
    expect(screen.getByText('10kg × 12')).toBeInTheDocument();
  });

  it('no longer renders the per-session history section', () => {
    renderPage();
    expect(screen.queryByText('Legs')).toBeNull();
  });
});

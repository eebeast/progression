import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RepositoryProvider } from '@/storage/RepositoryProvider';
import { of, type WorkoutRepository } from '@/storage/repository';
import Dashboard from '@/pages/Dashboard';
import type { Settings, WorkoutSession, WorkoutTemplate } from '@/types';

function tmpl(id: string, name: string, order: number): WorkoutTemplate {
  return { id, name, order, estimatedMinutes: 60, exercises: [], createdAt: 0, updatedAt: 0 };
}

const templates = [tmpl('push', 'Push', 0), tmpl('pull', 'Pull', 1), tmpl('legs', 'Legs', 2)];

const settings: Settings = {
  id: 'singleton',
  userName: 'Pat',
  unit: 'kg',
  theme: 'system',
  accent: 'blue',
  weightIncrement: 2.5,
  weeklyGoal: 4,
};

const completedPush: WorkoutSession = {
  id: 's1',
  templateId: 'push',
  templateName: 'Push',
  date: 1,
  startTime: 0,
  endTime: 1,
  notes: '',
  feeling: null,
  status: 'completed',
};

const legsActive: WorkoutSession = { ...completedPush, id: 's2', templateId: 'legs', templateName: 'Legs', status: 'active' };

// Last completed = Push -> today Pull, tomorrow Legs, anchor Push (loop-back).
function renderDashboard(over: Partial<WorkoutRepository> = {}) {
  const reorderTemplates = vi.fn().mockResolvedValue(undefined);
  const startSession = vi.fn().mockResolvedValue('new');
  const repo = {
    observeSettings: () => of(settings),
    observeTemplates: () => of(templates),
    observeCompletedSessions: () => of([completedPush]),
    observeActiveSession: () => of(null),
    reorderTemplates,
    startSession,
    discardSession: vi.fn().mockResolvedValue(undefined),
    ...over,
  } as unknown as WorkoutRepository;

  render(
    <MemoryRouter>
      <RepositoryProvider repository={repo}>
        <Dashboard />
      </RepositoryProvider>
    </MemoryRouter>,
  );
  return { reorderTemplates, startSession };
}

describe('Dashboard rotation', () => {
  it('shows every day in one list and drops the separate "Start a different workout" picker', () => {
    renderDashboard();
    expect(screen.queryByText(/start a different workout/i)).toBeNull();
    expect(screen.getByRole('heading', { name: /up next/i })).toBeInTheDocument();
    // Today / Tomorrow / Next labels for Pull / Legs / Push.
    for (const label of ['Today', 'Tomorrow', 'Next']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('promotes a day when its up-arrow is tapped (persists [anchor, ...newOrder])', async () => {
    const user = userEvent.setup();
    const { reorderTemplates } = renderDashboard();

    await user.click(screen.getByRole('button', { name: /move legs earlier/i }));
    // Legs promoted above Pull; anchor (push) stays pinned first.
    expect(reorderTemplates).toHaveBeenCalledWith(['push', 'legs', 'pull']);
  });

  it('does not offer reorder arrows on the looped-back anchor row', () => {
    renderDashboard();
    expect(screen.queryByRole('button', { name: /move push earlier/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /move push later/i })).toBeNull();
  });

  it('starts a workout straight from a row', async () => {
    const user = userEvent.setup();
    const { startSession } = renderDashboard();

    await user.click(screen.getByRole('button', { name: /start legs/i }));
    expect(startSession).toHaveBeenCalledWith(expect.objectContaining({ id: 'legs' }));
  });

  it('disables starting from a row while a workout is in progress', async () => {
    const user = userEvent.setup();
    const { startSession } = renderDashboard({ observeActiveSession: () => of(legsActive) });

    expect(screen.getByText(/workout in progress/i)).toBeInTheDocument();
    const start = screen.getByRole('button', { name: /start pull/i });
    expect(start).toBeDisabled();
    await user.click(start);
    expect(startSession).not.toHaveBeenCalled();
  });
});

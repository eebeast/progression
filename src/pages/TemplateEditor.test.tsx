import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RepositoryProvider } from '@/storage/RepositoryProvider';
import { of, type WorkoutRepository } from '@/storage/repository';
import TemplateEditor from './TemplateEditor';

describe('plan exercise identity', () => {
  it('retains the selected exercise ID when duplicate names exist', async () => {
    const updateTemplate = vi.fn().mockResolvedValue(undefined);
    const repo = {
      observeExercises: () => of([{ id: 'first', name: 'Squat', createdAt: 0 }, { id: 'original', name: 'Squat', createdAt: 0 }]),
      getTemplate: async () => ({ id: 'plan', name: 'Legs', estimatedMinutes: 30, exercises: [
        { assignmentId: 'assignment', exerciseId: 'original', name: 'Squat', targetSets: 3, targetRepRange: '8', order: 0 },
      ] }), updateTemplate,
    } as unknown as WorkoutRepository;
    const { container } = render(<MemoryRouter initialEntries={['/templates/plan']}><RepositoryProvider repository={repo}>
      <Routes><Route path="/templates/:templateId" element={<TemplateEditor />} /><Route path="/templates" element={<p>Saved</p>} /></Routes>
    </RepositoryProvider></MemoryRouter>);
    await screen.findByDisplayValue('Legs');
    expect(container.querySelector('select, datalist, input[list]')).toBeNull();
    expect(screen.queryByText('Rest timer')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Exercise name 1' })).toHaveAttribute('autocomplete', 'off');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Save' }));
    expect(updateTemplate).toHaveBeenCalledWith('plan', expect.objectContaining({ exercises: [expect.objectContaining({ exerciseId: 'original', assignmentId: 'assignment' })] }));
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });
});

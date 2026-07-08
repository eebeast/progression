import { describe, expect, it } from 'vitest';
import { deriveTodayTemplate, getRotation, getUpcoming } from '@/utils/program';
import type { WorkoutSession, WorkoutTemplate } from '@/types';

function tmpl(id: string, order: number, name: string): WorkoutTemplate {
  return { id, name, order, estimatedMinutes: 60, exercises: [], createdAt: 0, updatedAt: 0 };
}

// Sorted by order, as observeTemplates delivers them.
const templates = [tmpl('push', 0, 'Push'), tmpl('pull', 1, 'Pull'), tmpl('legs', 2, 'Legs')];

function completed(templateId: string): WorkoutSession {
  return {
    id: 's',
    templateId,
    templateName: '',
    date: 0,
    startTime: 0,
    endTime: 0,
    notes: '',
    feeling: null,
    status: 'completed',
  };
}

const names = (ts: WorkoutTemplate[]) => ts.map((t) => t.name);

describe('deriveTodayTemplate', () => {
  it('returns null with no templates', () => {
    expect(deriveTodayTemplate([], null)).toBeNull();
  });

  it('returns the first template when nothing is completed', () => {
    expect(deriveTodayTemplate(templates, null)?.name).toBe('Push');
  });

  it('returns the template after the last completed one', () => {
    expect(deriveTodayTemplate(templates, completed('push'))?.name).toBe('Pull');
  });

  it('wraps around at the end of the rotation', () => {
    expect(deriveTodayTemplate(templates, completed('legs'))?.name).toBe('Push');
  });

  it('falls back to the first template when the completed template no longer exists', () => {
    expect(deriveTodayTemplate(templates, completed('deleted'))?.name).toBe('Push');
  });
});

describe('getUpcoming', () => {
  it('returns the next N after current, wrapping', () => {
    const today = deriveTodayTemplate(templates, completed('push')); // Pull
    expect(names(getUpcoming(templates, today, 2))).toEqual(['Legs', 'Push']);
  });

  it('returns [] with a single template', () => {
    expect(getUpcoming([tmpl('a', 0, 'A')], tmpl('a', 0, 'A'), 2)).toEqual([]);
  });
});

describe('getRotation', () => {
  it('starts at today and excludes the anchor (the just-completed workout)', () => {
    const today = deriveTodayTemplate(templates, completed('push')); // Pull
    expect(names(getRotation(templates, today, 'push'))).toEqual(['Pull', 'Legs']);
  });

  it('includes every template when there is no anchor', () => {
    expect(names(getRotation(templates, templates[0], null))).toEqual(['Push', 'Pull', 'Legs']);
  });

  it('reordering the rotation and re-deriving reproduces the new sequence', () => {
    // Start: last completed Push -> today Pull, tomorrow Legs.
    const today = deriveTodayTemplate(templates, completed('push'));
    const rotation = getRotation(templates, today, 'push'); // [Pull, Legs]

    // User promotes Legs to today: new rotation [Legs, Pull]; persist [anchor, ...].
    const next = [rotation[1], rotation[0]];
    const ids = ['push', ...next.map((t) => t.id)];
    const reordered = ids
      .map((id, i) => {
        const t = templates.find((x) => x.id === id)!;
        return { ...t, order: i };
      })
      .sort((a, b) => a.order - b.order);

    const newToday = deriveTodayTemplate(reordered, completed('push'));
    expect(newToday?.name).toBe('Legs');
    expect(names(getUpcoming(reordered, newToday, 1))).toEqual(['Pull']);
  });
});

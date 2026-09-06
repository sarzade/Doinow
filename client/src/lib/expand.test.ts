import { describe, expect, it } from 'vitest';
import { expandDay, expandRange, somedayTasks } from './expand';
import type { Task } from './api';

function base(over: Partial<Task> = {}): Task {
  return {
    id: Math.random().toString(36).slice(2),
    listId: null,
    title: 't',
    note: '',
    dueDate: null,
    reminderAt: null,
    priority: 4,
    tags: [],
    isDone: false,
    recurrence: 'none',
    recurrenceRule: null,
    lastCompletedAt: null,
    myDay: false,
    myDayDate: null,
    subtasks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...over,
  };
}

const mondayRule = {
  freq: 'weekly' as const,
  interval: 1,
  byWeekday: [2],
  time: '14:00',
  start: new Date('2026-09-07T14:00:00').toISOString(),
  missed: 'keep' as const,
  end: { type: 'never' } as const,
};

describe('expandRange', () => {
  it('تسک ساده با dueDate در بازه می‌آید', () => {
    const t = base({ dueDate: '2026-09-08T10:00:00' });
    const out = expandRange(
      [t],
      new Date('2026-09-07T00:00:00'),
      new Date('2026-09-09T23:59:59'),
      new Date('2026-09-07T12:00:00'),
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.overdue).toBe(false);
  });

  it('قانون هفتگی بعد از lastCompletedAt ادامه می‌دهد', () => {
    const t = base({ recurrenceRule: mondayRule, lastCompletedAt: '2026-09-07T14:00:00' });
    const out = expandRange(
      [t],
      new Date('2026-09-07T00:00:00'),
      new Date('2026-09-21T23:59:59'),
      new Date('2026-09-08T12:00:00'),
    );
    expect(out.map((o) => o.date?.getDate())).toEqual([14, 21]);
  });

  it('missed=nextOnly گذشته را حذف می‌کند', () => {
    const t = base({
      recurrenceRule: {
        freq: 'daily',
        interval: 1,
        start: new Date('2026-09-01T09:00:00').toISOString(),
        missed: 'nextOnly',
        end: { type: 'never' },
      },
    });
    const out = expandRange(
      [t],
      new Date('2026-09-01T00:00:00'),
      new Date('2026-09-10T23:59:59'),
      new Date('2026-09-05T12:00:00'),
    );
    expect(out.map((o) => o.date?.getDate())).toEqual([5, 6, 7, 8, 9, 10]);
  });

  it('انجام‌شده‌ها حذف می‌شوند', () => {
    const t = base({ dueDate: '2026-09-08T10:00:00', isDone: true });
    const out = expandDay([t], new Date('2026-09-08T12:00:00'), new Date('2026-09-08T12:00:00'));
    expect(out).toHaveLength(0);
  });
});

describe('somedayTasks', () => {
  it('فقط بی‌تاریخِ بدون قانون', () => {
    const a = base({ title: 'a' });
    const b = base({ title: 'b', dueDate: '2026-09-08T10:00:00' });
    const c = base({ title: 'c', recurrenceRule: mondayRule });
    const d = base({ title: 'd', isDone: true });
    expect(somedayTasks([a, b, c, d]).map((t) => t.title)).toEqual(['a']);
  });
});

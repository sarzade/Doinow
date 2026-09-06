import { describe, expect, it } from 'vitest';
import { saturdayOf } from '../components/WeekCalendar';
import { applyOccOptions, type OccurrenceItem } from './expand';
import type { Priority, Task } from './api';

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

function item(title: string, priority: Priority, dateISO: string | null, overdue = false): OccurrenceItem {
  return { task: base({ title, priority }), date: dateISO ? new Date(dateISO) : null, overdue };
}

describe('saturdayOf', () => {
  it('شنبه همان هفته (شنبه تا جمعه)', () => {
    // دوشنبه ۷ سپتامبر ۲۰۲۶ → شنبه ۵ سپتامبر
    expect(saturdayOf(new Date(2026, 8, 7)).getDate()).toBe(5);
    // شنبه ۵ سپتامبر → خودش
    expect(saturdayOf(new Date(2026, 8, 5)).getDate()).toBe(5);
    // جمعه ۱۱ سپتامبر → شنبه ۵
    expect(saturdayOf(new Date(2026, 8, 11)).getDate()).toBe(5);
    // یکشنبه ۶ → شنبه ۵
    expect(saturdayOf(new Date(2026, 8, 6)).getDate()).toBe(5);
  });
});

describe('applyOccOptions', () => {
  const items = [
    item('ب', 1, '2026-09-10T10:00:00'),
    item('الف', 4, '2026-09-08T10:00:00'),
    item('ج', 2, null),
  ];

  it('مرتب‌سازی تاریخ (بی‌تاریخ آخر)', () => {
    expect(applyOccOptions(items, 'date', 'all').map((i) => i.task.title)).toEqual(['الف', 'ب', 'ج']);
  });

  it('مرتب‌سازی اولویت', () => {
    expect(applyOccOptions(items, 'priority', 'all').map((i) => i.task.title)).toEqual(['ب', 'ج', 'الف']);
  });

  it('مرتب‌سازی الفبا فارسی', () => {
    expect(applyOccOptions(items, 'alpha', 'all').map((i) => i.task.title)).toEqual(['الف', 'ب', 'ج']);
  });

  it('فیلتر معوق', () => {
    const withOver = [...items, item('د', 3, '2026-09-01T10:00:00', true)];
    expect(applyOccOptions(withOver, 'date', 'overdue').map((i) => i.task.title)).toEqual(['د']);
  });

  it('فیلتر تکرارشونده', () => {
    const rule = {
      freq: 'daily' as const,
      interval: 1,
      start: new Date('2026-09-01T09:00:00').toISOString(),
      missed: 'keep' as const,
      end: { type: 'never' } as const,
    };
    const withRule = [...items, { task: base({ title: 'ر', recurrenceRule: rule }), date: new Date('2026-09-08T09:00:00'), overdue: false } satisfies OccurrenceItem];
    expect(applyOccOptions(withRule, 'date', 'recurring').map((i) => i.task.title)).toEqual(['ر']);
  });
});

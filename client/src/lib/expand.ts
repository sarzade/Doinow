import type { Task } from './api';
import { effectiveRule, occurrences } from './recurrence';

export interface OccurrenceItem {
  task: Task;
  /** تاریخ وقوع (برای تسک ساده = dueDate) */
  date: Date | null;
  overdue: boolean;
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

/**
 * باز کردن تسک‌ها به وقوع‌ها در بازه [from, to].
 * - تسک ساده: اگر dueDate در بازه باشد.
 * - تسک قانون‌دار: وقوع‌های بسط‌یافته بعد از lastCompletedAt.
 *   missed=nextOnly → فقط وقوع‌های امروز به بعد.
 * - انجام‌شده‌ها حذف می‌شوند.
 */
export function expandRange(tasks: Task[], from: Date, to: Date, now = new Date()): OccurrenceItem[] {
  const todayStart = startOfDay(now).getTime();
  const out: OccurrenceItem[] = [];

  for (const t of tasks) {
    if (t.isDone) continue;
    const rule = effectiveRule(t);
    if (!rule) {
      if (!t.dueDate) continue;
      const d = new Date(t.dueDate);
      if (Number.isNaN(d.getTime()) || d < from || d > to) continue;
      out.push({ task: t, date: d, overdue: d.getTime() < todayStart });
      continue;
    }
    const occs = occurrences(rule, from, to, {
      after: t.lastCompletedAt,
      limit: 500,
    });
    for (const o of occs) {
      if (rule.missed === 'nextOnly' && o.getTime() < todayStart) continue;
      out.push({ task: t, date: o, overdue: o.getTime() < todayStart });
    }
  }

  out.sort((a, b) => {
    const at = a.date ? a.date.getTime() : Infinity;
    const bt = b.date ? b.date.getTime() : Infinity;
    if (at !== bt) return at - bt;
    if (a.task.priority !== b.task.priority) return a.task.priority - b.task.priority;
    return a.task.createdAt < b.task.createdAt ? -1 : 1;
  });
  return out;
}

/** وقوع‌های یک روز خاص */
export function expandDay(tasks: Task[], day: Date, now = new Date()): OccurrenceItem[] {
  const from = startOfDay(day);
  const to = new Date(from);
  to.setHours(23, 59, 59, 999);
  return expandRange(tasks, from, to, now);
}

/** تسک‌های بی‌تاریخ (یه روز) */
export function somedayTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => !t.isDone && !t.dueDate && !effectiveRule(t));
}

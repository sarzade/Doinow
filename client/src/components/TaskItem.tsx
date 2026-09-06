import type { Priority, Task } from '../lib/api';
import {
  formatGregorianSmall,
  formatJalali,
  formatTimeFa,
  isOverdue,
  toFaDigits,
} from '../lib/jalali';
import { effectiveRule } from '../lib/recurrence';

const PRIORITY_STYLE: Record<Priority, { dot: string; label: string }> = {
  1: { dot: 'bg-red-500', label: 'خیلی مهم' },
  2: { dot: 'bg-orange-400', label: 'مهم' },
  3: { dot: 'bg-blue-400', label: 'معمولی' },
  4: { dot: 'bg-gray-300 dark:bg-gray-600', label: 'کم' },
};

interface Props {
  task: Task;
  listTitle?: string;
  /** تاریخ نمایشی وقوع (برای تسک تکرارشونده) — پیش‌فرض dueDate تسک */
  dateISO?: string | null;
  onToggle: () => void;
  onOpen: () => void;
}

export default function TaskItem({ task, listTitle, dateISO, onToggle, onOpen }: Props) {
  const shownDue = dateISO !== undefined ? dateISO : task.dueDate;
  const overdue = !task.isDone && isOverdue(shownDue);
  const doneCount = task.subtasks.filter((s) => s.isDone).length;

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border p-3 transition-colors ${
        task.isDone
          ? 'border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/60'
          : overdue
            ? 'border-red-200 bg-red-50/60 dark:border-red-900/60 dark:bg-red-950/20'
            : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={task.isDone ? 'باز کردن تسک' : 'انجام شد'}
        className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          task.isDone
            ? 'border-brand-600 bg-brand-600 text-white'
            : 'border-gray-300 hover:border-brand-500 dark:border-gray-600'
        }`}
      >
        {task.isDone && (
          <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M2 6.5 4.8 9 10 3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-right">
        <div
          className={`truncate text-[15px] font-medium text-gray-900 dark:text-gray-100 ${
            task.isDone ? 'line-through opacity-50' : ''
          }`}
        >
          {task.title}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <span
            className={`inline-block h-2 w-2 rounded-full ${PRIORITY_STYLE[task.priority].dot}`}
            title={PRIORITY_STYLE[task.priority].label}
          />
          {shownDue && (
            <span className={overdue ? 'font-medium text-red-600 dark:text-red-400' : ''}>
              {formatJalali(shownDue)}
              <span className="text-gray-400"> ({formatGregorianSmall(shownDue)})</span>
            </span>
          )}
          {task.reminderAt && <span>یادآور {formatTimeFa(task.reminderAt)}</span>}
          {listTitle && <span className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-800">{listTitle}</span>}
          {task.tags.map((t) => (
            <span key={t} className="text-brand-600 dark:text-brand-100">
              #{t}
            </span>
          ))}
          {task.subtasks.length > 0 && (
            <span>
              {toFaDigits(doneCount)}/{toFaDigits(task.subtasks.length)} زیرکار
            </span>
          )}
          {effectiveRule(task) && <span>تکرارشونده</span>}
        </div>
      </button>
    </div>
  );
}

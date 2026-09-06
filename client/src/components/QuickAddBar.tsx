import { useState } from 'react';
import ReminderWheel from './ReminderWheel';
import { formatJalali } from '../lib/jalali';
import { useStore } from '../store/useStore';

interface Props {
  defaultListId?: string | null;
}

/** نوار افزودن سریع «می‌خوام…» با چیپ‌های یادآور مثل Any.do */
export default function QuickAddBar({ defaultListId }: Props) {
  const { createTask } = useStore();
  const [text, setText] = useState('');
  const [due, setDue] = useState<Date | null>(null);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [sending, setSending] = useState(false);

  function chipDate(kind: 'tomorrow' | 'week'): Date {
    const d = new Date();
    d.setDate(d.getDate() + (kind === 'tomorrow' ? 1 : 7));
    d.setHours(9, 0, 0, 0);
    return d;
  }

  const dueIs = (kind: 'tomorrow' | 'week'): boolean => {
    if (!due) return false;
    const c = chipDate(kind);
    return (
      due.getFullYear() === c.getFullYear() &&
      due.getMonth() === c.getMonth() &&
      due.getDate() === c.getDate()
    );
  };

  async function send(): Promise<void> {
    const title = text.trim();
    if (!title || sending) return;
    setSending(true);
    await createTask({
      listId: defaultListId ?? null,
      title,
      dueDate: due ? due.toISOString() : null,
      reminderAt: due ? due.toISOString() : null,
    });
    setText('');
    setDue(null);
    setSending(false);
  }

  const chipCls = (active: boolean): string =>
    `shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
      active
        ? 'bg-brand-600 text-white'
        : 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
    }`;

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        <button type="button" onClick={() => setWheelOpen(true)} className={chipCls(due !== null && !dueIs('tomorrow') && !dueIs('week'))}>
          سفارشی{due && !dueIs('tomorrow') && !dueIs('week') ? ` (${formatJalali(due)})` : ''}
        </button>
        <button
          type="button"
          onClick={() => setDue((d) => (d && dueIs('tomorrow') ? null : chipDate('tomorrow')))}
          className={chipCls(dueIs('tomorrow'))}
        >
          فردا
        </button>
        <button
          type="button"
          onClick={() => setDue((d) => (d && dueIs('week') ? null : chipDate('week')))}
          className={chipCls(dueIs('week'))}
        >
          هفته بعد
        </button>
      </div>
      <div className="flex items-center gap-2 rounded-full border border-gray-300 bg-white p-1.5 pr-4 dark:border-gray-700 dark:bg-gray-900">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void send();
          }}
          placeholder="می‌خوام…"
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-gray-400"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={!text.trim() || sending}
          aria-label="افزودن"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xl text-white disabled:opacity-40"
        >
          ↑
        </button>
      </div>
      {wheelOpen && (
        <ReminderWheel
          initial={due}
          onSet={(d) => {
            setDue(d);
            setWheelOpen(false);
          }}
          onClose={() => setWheelOpen(false)}
        />
      )}
    </div>
  );
}

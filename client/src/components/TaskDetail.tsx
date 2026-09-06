import { useState } from 'react';
import type { Priority, Task, TaskInput } from '../lib/api';
import { formatGregorianSmall, formatJalali, formatJalaliWeekday, formatTimeFa } from '../lib/jalali';
import { describeFa, effectiveRule, type RecurrenceRule } from '../lib/recurrence';
import { useStore } from '../store/useStore';
import JalaliInput from './JalaliInput';
import RecurrenceSheet from './RecurrenceSheet';
import ReminderWheel from './ReminderWheel';

interface Props {
  task: Task | null; // null = ساخت جدید
  defaultListId?: string | null;
  presetDue?: string | null;
  onClose: () => void;
}

interface LocalSub {
  id: string;
  title: string;
  isDone: boolean;
}

function uid(): string {
  return `loc_${Math.random().toString(36).slice(2, 9)}`;
}

/** صفحه جزئیات تسک تمام‌صفحه مثل Any.do (بدون مکان) */
export default function TaskDetail({ task, defaultListId, presetDue, onClose }: Props) {
  const { lists, createTask, updateTask, deleteTask, toggleSubtask } = useStore();
  const [title, setTitle] = useState(task?.title ?? '');
  const [note, setNote] = useState(task?.note ?? '');
  const [listId, setListId] = useState<string | null>(task?.listId ?? defaultListId ?? null);
  const [dueDate, setDueDate] = useState<string | null>(task?.dueDate ?? presetDue ?? null);
  const [reminderAt, setReminderAt] = useState<string | null>(task?.reminderAt ?? null);
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 4);
  const [tags, setTags] = useState((task?.tags ?? []).join('، '));
  const [rule, setRule] = useState<RecurrenceRule | null>(() =>
    task ? (effectiveRule(task) ?? null) : null,
  );
  const [subs, setSubs] = useState<LocalSub[]>(
    (task?.subtasks ?? []).map((s) => ({ ...s })),
  );
  const [newSub, setNewSub] = useState('');
  const [myDayOn, setMyDayOn] = useState(task?.myDay ?? false);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const listName = lists.find((l) => l.id === listId)?.title ?? 'بدون لیست';

  function addSub(): void {
    const t = newSub.trim();
    if (!t) return;
    setSubs((p) => [...p, { id: uid(), title: t, isDone: false }]);
    setNewSub('');
  }

  async function handleSave(): Promise<void> {
    if (!title.trim() || saving) return;
    setSaving(true);
    const tagArr = tags
      .split(/[،,]/)
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);
    const input: TaskInput & { isDone?: boolean } = {
      listId,
      title: title.trim(),
      note: note.trim(),
      dueDate,
      reminderAt,
      priority,
      tags: tagArr,
      recurrenceRule: rule,
      myDay: myDayOn,
      myDayDate: myDayOn ? (task?.myDayDate ?? new Date().toISOString()) : null,
      subtasks: subs.map((s) => ({ title: s.title, isDone: s.isDone })),
    };
    if (task) await updateTask(task.id, input);
    else await createTask(input);
    setSaving(false);
    onClose();
  }

  async function handleDelete(): Promise<void> {
    if (!task) return;
    if (!window.confirm('این تسک حذف شود؟')) return;
    await deleteTask(task.id);
    onClose();
  }

  async function toggleLocalSub(id: string): Promise<void> {
    const existing = task?.subtasks.find((s) => s.id === id);
    if (task && existing) {
      await toggleSubtask(task.id, id);
      setSubs((p) => p.map((s) => (s.id === id ? { ...s, isDone: !s.isDone } : s)));
    } else {
      setSubs((p) => p.map((s) => (s.id === id ? { ...s, isDone: !s.isDone } : s)));
    }
  }

  const actionChip =
    'flex items-center justify-center gap-1.5 rounded-full bg-gray-100 px-3 py-2.5 text-[13px] font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-200';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-950">
      {/* هدر */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 pb-3 pt-[env(safe-area-inset-top)] pt-4 dark:border-gray-800">
        <button
          type="button"
          onClick={onClose}
          aria-label="بازگشت"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xl dark:bg-gray-800"
        >
          →
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!title.trim() || saving}
          className="rounded-full bg-brand-600/10 px-6 py-2.5 font-black text-brand-600 disabled:opacity-40 dark:text-brand-100"
        >
          {saving ? '…' : 'ذخیره'}
        </button>
      </div>

      <div className="nice-scroll mx-auto w-full max-w-lg flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div className="text-xs text-gray-400">لیست‌ها › {listName}</div>

        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان تسک…"
          rows={2}
          autoFocus={!task}
          className="w-full resize-none bg-transparent text-2xl font-black leading-snug outline-none placeholder:text-gray-300 dark:placeholder:text-gray-700"
        />

        <div className="grid grid-cols-2 gap-2">
          {task && (
            <button
              type="button"
              className={actionChip}
              onClick={() => {
                void useStore.getState().toggleTask(task.id);
                onClose();
              }}
            >
              <span className="text-brand-600">✓</span> انجام شد
            </button>
          )}
          <button
            type="button"
            onClick={() => setMyDayOn((v) => !v)}
            className={`${actionChip} ${myDayOn ? '!bg-brand-600 !text-white' : ''}`}
          >
            <span>◎</span> روز من
          </button>
          <button type="button" onClick={() => setWheelOpen(true)} className={actionChip}>
            <span>◷</span> {reminderAt ? formatTimeFa(reminderAt) : 'یادآور'}
          </button>
          <button type="button" onClick={() => setRuleOpen(true)} className={actionChip}>
            <span>⟳</span> {rule ? 'تکرار شده' : 'تکرار'}
          </button>
        </div>
        {rule && (
          <p className="-mt-2 text-xs text-brand-600 dark:text-brand-100">{describeFa(rule)}</p>
        )}
        {reminderAt && (
          <p className="-mt-2 text-xs text-gray-400">
            یادآور: {formatJalaliWeekday(reminderAt)} ساعت {formatTimeFa(reminderAt)}
          </p>
        )}

        <div>
          <div className="mb-1.5 text-xs font-bold text-gray-400">لیست</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setListId(null)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${listId === null ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-800'}`}
            >
              بدون لیست
            </button>
            {lists.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setListId(l.id)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold ${listId === l.id ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-800'}`}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
                {l.title}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-xs font-bold text-gray-400">سررسید (شمسی)</div>
          <JalaliInput value={dueDate} onChange={setDueDate} />
          {dueDate && (
            <p className="mt-1 text-xs text-gray-400">
              {formatJalali(dueDate)} — {formatGregorianSmall(dueDate)}
            </p>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center gap-2 text-xs font-bold text-gray-400">
            <span className="text-base text-gray-300">#</span> تگ‌ها
          </div>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="کار، شخصی… (با ویرگول)"
            className="w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm outline-none dark:bg-gray-800"
          />
        </div>

        <div>
          <div className="mb-1.5 text-xs font-bold text-gray-400">اولویت</div>
          <div className="flex gap-1.5">
            {(
              [
                { v: 1, label: 'خیلی مهم', dot: 'bg-red-500' },
                { v: 2, label: 'مهم', dot: 'bg-orange-400' },
                { v: 3, label: 'معمولی', dot: 'bg-blue-400' },
                { v: 4, label: 'کم', dot: 'bg-gray-300' },
              ] as const
            ).map((p) => (
              <button
                key={p.v}
                type="button"
                onClick={() => setPriority(p.v)}
                className={`flex flex-1 items-center justify-center gap-1 rounded-full px-1 py-2 text-[11px] font-bold ${
                  priority === p.v ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-800'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${p.dot}`} />
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-xs font-bold text-gray-400">زیرکارها</div>
          <div className="space-y-2">
            {subs.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void toggleLocalSub(s.id)}
                  aria-label="تیک زیرکار"
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${s.isDone ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300 dark:border-gray-600'}`}
                >
                  {s.isDone && (
                    <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4">
                      <path d="M2 6.5 4.8 9 10 3.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <span className={`flex-1 text-[15px] ${s.isDone ? 'line-through opacity-40' : ''}`}>
                  {s.title}
                </span>
                <button
                  type="button"
                  onClick={() => setSubs((p) => p.filter((x) => x.id !== s.id))}
                  className="px-2 text-gray-300"
                  aria-label="حذف زیرکار"
                >
                  ✕
                </button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 shrink-0 rounded-full border-2 border-gray-200 dark:border-gray-700" />
              <input
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSub();
                  }
                }}
                placeholder="زیرکار جدید…"
                className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-gray-300 dark:placeholder:text-gray-700"
              />
            </div>
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-xs font-bold text-gray-400">یادداشت</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="یادداشت…"
            rows={3}
            className="w-full resize-y rounded-2xl bg-gray-100 px-4 py-3 text-sm outline-none dark:bg-gray-800"
          />
        </div>

        {task && (
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="w-full rounded-2xl bg-red-50 py-3 text-sm font-bold text-red-600 dark:bg-red-950/40 dark:text-red-400"
          >
            حذف تسک
          </button>
        )}
        <div className="h-6" />
      </div>

      {wheelOpen && (
        <ReminderWheel
          initial={reminderAt ? new Date(reminderAt) : dueDate ? new Date(dueDate) : null}
          onSet={(d) => {
            setReminderAt(d ? d.toISOString() : null);
            setWheelOpen(false);
          }}
          onClose={() => setWheelOpen(false)}
        />
      )}
      {ruleOpen && (
        <RecurrenceSheet
          initial={rule}
          defaultStartISO={dueDate}
          onSave={(r) => {
            setRule(r);
            setRuleOpen(false);
          }}
          onClose={() => setRuleOpen(false)}
        />
      )}
    </div>
  );
}

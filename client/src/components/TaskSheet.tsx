import { useState } from 'react';
import type { Priority, Task, TaskInput } from '../lib/api';
import { formatGregorianSmall, formatJalali } from '../lib/jalali';
import { describeFa, effectiveRule, type RecurrenceRule } from '../lib/recurrence';
import { useStore } from '../store/useStore';
import JalaliInput from './JalaliInput';
import RecurrenceSheet from './RecurrenceSheet';

interface Props {
  task: Task | null; // null یعنی ساخت جدید
  defaultListId?: string | null;
  onClose: () => void;
}

const PRIORITIES: { v: Priority; label: string; cls: string }[] = [
  { v: 1, label: 'خیلی مهم', cls: 'bg-red-500' },
  { v: 2, label: 'مهم', cls: 'bg-orange-400' },
  { v: 3, label: 'معمولی', cls: 'bg-blue-400' },
  { v: 4, label: 'کم', cls: 'bg-gray-300' },
];

const LIST_COLORS = ['#7c3aed', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'];

export default function TaskSheet({ task, defaultListId, onClose }: Props) {
  const { lists, createTask, updateTask, deleteTask, toggleSubtask, createList } = useStore();
  const [title, setTitle] = useState(task?.title ?? '');
  const [note, setNote] = useState(task?.note ?? '');
  const [listId, setListId] = useState<string | null>(task?.listId ?? defaultListId ?? null);
  const [dueDate, setDueDate] = useState<string | null>(task?.dueDate ?? null);
  const [reminderAt, setReminderAt] = useState<string | null>(task?.reminderAt ?? null);
  const [reminderTime, setReminderTime] = useState(
    task?.reminderAt ? new Date(task.reminderAt).toTimeString().slice(0, 5) : '09:00',
  );
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 4);
  const [tags, setTags] = useState((task?.tags ?? []).join('، '));
  const [rule, setRule] = useState<RecurrenceRule | null>(() =>
    task ? (effectiveRule(task) ?? null) : null,
  );
  const [ruleOpen, setRuleOpen] = useState(false);
  const [newSub, setNewSub] = useState('');
  const [saving, setSaving] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showNewList, setShowNewList] = useState(false);

  async function handleSave(): Promise<void> {
    if (!title.trim() || saving) return;
    setSaving(true);
    let reminder: string | null = null;
    if (reminderAt && dueDate) {
      const d = new Date(dueDate);
      const [h, m] = reminderTime.split(':').map(Number);
      d.setHours(h, m, 0, 0);
      reminder = d.toISOString();
    }
    const tagArr = tags
      .split(/[،,]/)
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);
    const input: TaskInput & { isDone?: boolean } = {
      listId,
      title: title.trim(),
      note: note.trim(),
      dueDate,
      reminderAt: reminder,
      priority,
      tags: tagArr,
      recurrenceRule: rule,
    };
    if (task) {
      if (newSub.trim()) {
        input.subtasks = [
          ...task.subtasks.map((s) => ({ title: s.title, isDone: s.isDone })),
          { title: newSub.trim() },
        ];
      }
      await updateTask(task.id, input);
    } else {
      input.subtasks = newSub.trim() ? [{ title: newSub.trim() }] : [];
      await createTask(input);
    }
    setSaving(false);
    onClose();
  }

  async function handleDelete(): Promise<void> {
    if (!task) return;
    if (!window.confirm('این تسک حذف شود؟')) return;
    await deleteTask(task.id);
    onClose();
  }

  const inputCls =
    'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[15px] text-gray-900 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="sheet-enter nice-scroll max-h-[92svh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 dark:bg-gray-900 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {task ? 'ویرایش تسک' : 'تسک جدید'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-300"
          >
            بستن
          </button>
        </div>

        <div className="space-y-4">
          <input
            className={inputCls}
            placeholder="عنوان تسک…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <textarea
            className={`${inputCls} min-h-16 resize-y`}
            placeholder="توضیح (اختیاری)…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div>
            <label className="mb-1.5 block text-xs text-gray-500">لیست</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setListId(null)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  listId === null
                    ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-600/20 dark:text-brand-100'
                    : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300'
                }`}
              >
                بدون لیست
              </button>
              {lists.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setListId(l.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
                    listId === l.id
                      ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-600/20 dark:text-brand-100'
                      : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
                  {l.title}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowNewList((v) => !v)}
                className="rounded-full border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-500"
              >
                + لیست جدید
              </button>
            </div>
            {showNewList && (
              <div className="mt-2 flex gap-2">
                <input
                  className={inputCls}
                  placeholder="نام لیست…"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                />
                <button
                  type="button"
                  className="shrink-0 rounded-xl bg-brand-600 px-4 text-sm text-white"
                  onClick={() => {
                    if (!newListName.trim()) return;
                    void createList(newListName.trim(), LIST_COLORS[lists.length % LIST_COLORS.length]);
                    setNewListName('');
                    setShowNewList(false);
                  }}
                >
                  بساز
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-gray-500">سررسید (شمسی)</label>
            <JalaliInput value={dueDate} onChange={setDueDate} />
            {dueDate && (
              <p className="mt-1 text-xs text-gray-400">
                {formatJalali(dueDate)} — {formatGregorianSmall(dueDate)}
              </p>
            )}
          </div>

          {dueDate && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasReminder"
                checked={reminderAt !== null}
                onChange={(e) => setReminderAt(e.target.checked ? dueDate : null)}
                className="h-4 w-4 accent-violet-600"
              />
              <label htmlFor="hasReminder" className="text-sm text-gray-700 dark:text-gray-200">
                یادآور در این روز ساعت
              </label>
              <input
                type="time"
                value={reminderTime}
                disabled={reminderAt === null}
                onChange={(e) => setReminderTime(e.target.value)}
                className="rounded-xl border border-gray-200 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs text-gray-500">اولویت</label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.v}
                  type="button"
                  onClick={() => setPriority(p.v)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs ${
                    priority === p.v
                      ? 'border-brand-600 bg-brand-50 dark:bg-brand-600/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${p.cls}`} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs text-gray-500">تگ‌ها (با ویرگول جدا کن)</label>
              <input
                className={inputCls}
                placeholder="کار، شخصی…"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-gray-500">تکرار</label>
              <button
                type="button"
                onClick={() => setRuleOpen(true)}
                className="w-full rounded-xl border border-gray-200 bg-white px-2 py-2.5 text-right text-sm dark:border-gray-700 dark:bg-gray-800"
              >
                {rule ? (
                  <span className="font-bold text-brand-700 dark:text-brand-100">
                    {describeFa(rule)}
                  </span>
                ) : (
                  <span className="text-gray-400">بدون تکرار — برای تنظیم بزن</span>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-gray-500">زیرکارها</label>
            {task && task.subtasks.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {task.subtasks.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => void toggleSubtask(task.id, s.id)}
                    className="flex w-full items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-right text-sm dark:bg-gray-800"
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                        s.isDone ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {s.isDone && (
                        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4">
                          <path d="M2 6.5 4.8 9 10 3.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className={s.isDone ? 'line-through opacity-50' : ''}>{s.title}</span>
                  </button>
                ))}
              </div>
            )}
            <input
              className={inputCls}
              placeholder="زیرکار جدید… (Enter)"
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleSave();
                }
              }}
            />
          </div>

          <div className="flex gap-2 pt-1">
            {task && (
              <button
                type="button"
                onClick={() => void handleDelete()}
                className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:bg-red-950/40 dark:text-red-400"
              >
                حذف
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!title.trim() || saving}
              className="flex-1 rounded-2xl bg-brand-600 py-3 text-[15px] font-bold text-white disabled:opacity-40"
            >
              {saving ? 'در حال ذخیره…' : task ? 'ذخیره تغییرات' : 'افزودن تسک'}
            </button>
          </div>
        </div>
      </div>
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

import { useEffect, useMemo, useState } from 'react';
import BottomNav from './components/BottomNav';
import MonthCalendar from './components/MonthCalendar';
import TaskItem from './components/TaskItem';
import TaskSheet from './components/TaskSheet';
import type { Task } from './lib/api';
import { serverBase } from './lib/api';
import {
  addDays,
  formatGregorianSmall,
  formatJalali,
  formatJalaliWeekday,
  isSameDay,
  startOfDay,
  toFaDigits,
} from './lib/jalali';
import { useStore } from './store/useStore';

const LIST_COLORS = ['#7c3aed', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'];

function sortTasks(tasks: Task[]): Task[] {
  const rank = (t: Task): number => t.priority;
  return [...tasks].sort((a, b) => {
    if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
    if (!a.dueDate && b.dueDate) return 1;
    if (a.dueDate && !b.dueDate) return -1;
    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate)
      return a.dueDate < b.dueDate ? -1 : 1;
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    return b.createdAt < a.createdAt ? 1 : -1;
  });
}

export default function App() {
  const s = useStore();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [sheetListId, setSheetListId] = useState<string | null>(null);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [calDay, setCalDay] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');

  useEffect(() => {
    void s.boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onOnline(): void {
      void s.syncNow();
    }
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const listName = useMemo(() => {
    const m = new Map(s.lists.map((l) => [l.id, l.title]));
    return (id: string | null): string | undefined =>
      id ? m.get(id) : undefined;
  }, [s.lists]);

  const todayTasks = useMemo(() => {
    const now = new Date();
    const endToday = addDays(startOfDay(now), 1);
    return sortTasks(
      s.tasks.filter((t) => {
        if (t.isDone) return false;
        if (!t.dueDate) return true; // بی‌تاریخ‌ها هم در امروز
        return new Date(t.dueDate).getTime() < endToday.getTime();
      }),
    );
  }, [s.tasks]);

  const doneToday = useMemo(
    () => s.tasks.filter((t) => t.isDone).length,
    [s.tasks],
  );

  const listTasks = useMemo(
    () =>
      sortTasks(
        s.tasks.filter((t) =>
          activeListId ? t.listId === activeListId : t.listId === null,
        ),
      ),
    [s.tasks, activeListId],
  );

  const calTasks = useMemo(() => {
    if (!calDay) return [];
    const d = new Date(calDay);
    return sortTasks(s.tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), d)));
  }, [s.tasks, calDay]);

  const searchResults = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return sortTasks(
      s.tasks.filter(
        (t) =>
          t.title.includes(q) ||
          t.note.includes(q) ||
          t.tags.some((tag) => tag.includes(q)),
      ),
    ).slice(0, 50);
  }, [s.tasks, query]);

  function openNew(listId: string | null = null): void {
    setEditing(null);
    setSheetListId(listId);
    setSheetOpen(true);
  }

  function openEdit(t: Task): void {
    setEditing(t);
    setSheetListId(t.listId);
    setSheetOpen(true);
  }

  if (!s.booted) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="mx-auto mb-3 h-14 w-14 animate-pulse rounded-3xl bg-brand-600 text-3xl font-black text-white">
            <span className="flex h-full items-center justify-center">د</span>
          </div>
          <p className="text-sm text-gray-500">در حال بارگذاری دوینو…</p>
        </div>
      </div>
    );
  }

  if (!s.user) return <AuthScreen />;

  return (
    <div className="min-h-svh bg-gray-50 pb-24 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-600 text-xl font-black text-white">
              د
            </div>
            <div>
              <h1 className="text-base font-black leading-none">دوینو</h1>
              <p className="mt-0.5 text-[11px] text-gray-400">
                {formatJalaliWeekday(new Date())}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {s.offline && (
              <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[11px] text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                آفلاین{s.pendingOps > 0 ? ` (${toFaDigits(s.pendingOps)})` : ''}
              </span>
            )}
            {s.syncing ? (
              <span className="text-[11px] text-gray-400">سینک…</span>
            ) : (
              <button
                type="button"
                onClick={() => void s.syncNow()}
                className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-500 dark:bg-gray-800 dark:text-gray-300"
              >
                سینک
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-4">
        {s.error && (
          <div className="mb-3 flex items-center justify-between rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
            <span>{s.error}</span>
            <button type="button" onClick={s.clearError} className="px-2">
              ✕
            </button>
          </div>
        )}

        {s.tab === 'today' && (
          <section>
            <div className="mb-3 rounded-2xl bg-gradient-to-l from-brand-600 to-violet-500 p-4 text-white">
              <div className="text-sm opacity-80">{formatGregorianSmall(new Date())}</div>
              <div className="text-xl font-black">{formatJalaliWeekday(new Date())}</div>
              <div className="mt-1 text-sm opacity-90">
                {toFaDigits(todayTasks.length)} کار باز • {toFaDigits(doneToday)} انجام‌شده
              </div>
            </div>
            <TaskListView
              tasks={todayTasks}
              listName={listName}
              empty="برای امروز کاری نداری. از دکمه + اضافه کن."
              onToggle={(t) => void s.toggleTask(t.id)}
              onOpen={openEdit}
            />
          </section>
        )}

        {s.tab === 'lists' && (
          <section>
            <div className="nice-scroll mb-3 flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setActiveListId(null)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm ${
                  activeListId === null
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                }`}
              >
                بدون لیست
              </button>
              {s.lists.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setActiveListId(l.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm ${
                    activeListId === l.id
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
                  {l.title}
                </button>
              ))}
            </div>
            <div className="mb-3 flex gap-2">
              <input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="نام لیست جدید…"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newListName.trim()) return;
                  void s.createList(newListName.trim(), LIST_COLORS[s.lists.length % LIST_COLORS.length]);
                  setNewListName('');
                }}
                className="shrink-0 rounded-xl bg-brand-600 px-4 text-sm text-white"
              >
                بساز
              </button>
            </div>
            <TaskListView
              tasks={listTasks}
              listName={listName}
              empty="این لیست خالی است."
              onToggle={(t) => void s.toggleTask(t.id)}
              onOpen={openEdit}
            />
          </section>
        )}

        {s.tab === 'calendar' && (
          <section className="space-y-3">
            <MonthCalendar tasks={s.tasks} selectedDay={calDay} onSelectDay={setCalDay} />
            {calDay && (
              <div>
                <h3 className="mb-2 text-sm font-bold">
                  کارهای {formatJalali(calDay)}
                </h3>
                <TaskListView
                  tasks={calTasks}
                  listName={listName}
                  empty="در این روز کاری ثبت نشده."
                  onToggle={(t) => void s.toggleTask(t.id)}
                  onOpen={openEdit}
                />
              </div>
            )}
          </section>
        )}

        {s.tab === 'search' && (
          <section>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجو در عنوان، توضیح و تگ…"
              className="mb-3 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900"
            />
            {query.trim() === '' ? (
              <p className="text-center text-sm text-gray-400">عبارتی بنویس تا جستجو کنم.</p>
            ) : (
              <TaskListView
                tasks={searchResults}
                listName={listName}
                empty="چیزی پیدا نشد."
                onToggle={(t) => void s.toggleTask(t.id)}
                onOpen={openEdit}
              />
            )}
          </section>
        )}

        {s.tab === 'settings' && <SettingsView />}
      </main>

      {s.tab !== 'settings' && (
        <button
          type="button"
          onClick={() => openNew(s.tab === 'lists' ? activeListId : null)}
          aria-label="تسک جدید"
          className="fixed bottom-20 left-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-3xl text-white shadow-lg"
        >
          +
        </button>
      )}

      <BottomNav tab={s.tab} onChange={s.setTab} />

      {sheetOpen && (
        <TaskSheet
          task={editing}
          defaultListId={sheetListId}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  );
}

function TaskListView({
  tasks,
  listName,
  empty,
  onToggle,
  onOpen,
}: {
  tasks: Task[];
  listName: (id: string | null) => string | undefined;
  empty: string;
  onToggle: (t: Task) => void;
  onOpen: (t: Task) => void;
}) {
  const s = useStore();
  if (tasks.length === 0)
    return <p className="py-8 text-center text-sm text-gray-400">{empty}</p>;
  return (
    <div className="space-y-2">
      {tasks.map((t) => (
        <TaskItem
          key={t.id}
          task={t}
          listTitle={listName(t.listId)}
          onToggle={() => onToggle(t)}
          onOpen={() => onOpen(t)}
        />
      ))}
      <div className="pt-1 text-center text-[11px] text-gray-400">
        {toFaDigits(tasks.length)} تسک • برای سینک دستی دکمه سینک را بزن
        <span className="hidden">{s.lastSync}</span>
      </div>
    </div>
  );
}

function SettingsView() {
  const s = useStore();
  const [listName, setListName] = useState('');
  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="text-sm text-gray-500">حساب کاربری</div>
        <div className="mt-1 font-bold">{s.user?.displayName}</div>
        <div className="text-sm text-gray-500" dir="ltr">
          {s.user?.email}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-2 text-sm font-bold">سرور</div>
        <div className="text-sm text-gray-500" dir="ltr">
          {serverBase()}
        </div>
        <div className="mt-1 text-xs text-gray-400">
          {s.offline ? 'وضعیت: آفلاین (تغییرات در صف سینک)' : 'وضعیت: متصل'}
          {s.lastSync ? ` • آخرین سینک: ${formatJalali(s.lastSync)}` : ''}
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => void s.syncNow()}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm text-white"
          >
            سینک الان
          </button>
          <button
            type="button"
            onClick={s.exportBackup}
            className="rounded-xl bg-gray-100 px-4 py-2 text-sm dark:bg-gray-800"
          >
            دانلود بکاپ
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-2 text-sm font-bold">لیست جدید</div>
        <div className="flex gap-2">
          <input
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="نام لیست…"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <button
            type="button"
            onClick={() => {
              if (!listName.trim()) return;
              void s.createList(listName.trim(), LIST_COLORS[s.lists.length % LIST_COLORS.length]);
              setListName('');
            }}
            className="shrink-0 rounded-xl bg-brand-600 px-4 text-sm text-white"
          >
            بساز
          </button>
        </div>
        <div className="mt-2 space-y-1.5">
          {s.lists.map((l) => (
            <ListRow key={l.id} id={l.id} title={l.title} color={l.color} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">حالت تیره</span>
          <button
            type="button"
            onClick={s.toggleTheme}
            className={`h-7 w-12 rounded-full p-1 transition-colors ${s.theme === 'dark' ? 'bg-brand-600' : 'bg-gray-200'}`}
            aria-label="تغییر تم"
          >
            <span
              className={`block h-5 w-5 rounded-full bg-white transition-transform ${s.theme === 'dark' ? '-translate-x-5' : ''}`}
            />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          if (window.confirm('از حساب خارج شوی؟ (داده‌های سینک‌شده روی سرور می‌ماند)')) void s.logout();
        }}
        className="w-full rounded-2xl bg-red-50 py-3 text-sm font-bold text-red-600 dark:bg-red-950/40 dark:text-red-400"
      >
        خروج از حساب
      </button>
    </section>
  );
}

function ListRow({ id, title, color }: { id: string; title: string; color: string }) {
  const s = useStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(title);
  if (!editing) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800">
        <span className="h-3 w-3 rounded-full" style={{ background: color }} />
        <span className="flex-1">{title}</span>
        <button type="button" onClick={() => setEditing(true)} className="text-xs text-gray-400">
          ویرایش
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`لیست «${title}» حذف شود؟ تسک‌هایش بی‌لیست می‌شوند.`))
              void s.deleteList(id);
          }}
          className="text-xs text-red-400"
        >
          حذف
        </button>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
      />
      <button
        type="button"
        onClick={() => {
          if (name.trim()) void s.updateList(id, { title: name.trim() });
          setEditing(false);
        }}
        className="shrink-0 rounded-xl bg-brand-600 px-3 text-sm text-white"
      >
        ذخیره
      </button>
    </div>
  );
}

function AuthScreen() {
  const s = useStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (mode === 'login') await s.login(email.trim(), password);
    else await s.register(email.trim(), password, name.trim() || email.split('@')[0]);
  }

  const inputCls =
    'w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900';

  return (
    <div className="flex min-h-svh items-center justify-center bg-gray-50 p-5 dark:bg-gray-950">
      <form onSubmit={(e) => void submit(e)} className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-600 text-4xl font-black text-white">
            د
          </div>
          <h1 className="text-2xl font-black">دوینو</h1>
          <p className="mt-1 text-sm text-gray-500">مدیریت کارهای روزانه • فارسی و راست‌چین</p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-gray-200/70 p-1 dark:bg-gray-800">
          {(
            [
              { id: 'login', label: 'ورود' },
              { id: 'register', label: 'ثبت‌نام' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setMode(m.id);
                s.clearError();
              }}
              className={`rounded-xl py-2 text-sm font-bold ${
                mode === m.id ? 'bg-white shadow dark:bg-gray-900' : 'text-gray-500'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {mode === 'register' && (
            <input
              className={inputCls}
              placeholder="نام نمایشی"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
          <input
            className={inputCls}
            placeholder="ایمیل"
            type="email"
            dir="ltr"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className={inputCls}
            placeholder="رمز عبور (حداقل ۶ کاراکتر)"
            type="password"
            dir="ltr"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {s.authError && (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-center text-sm text-red-600 dark:bg-red-950/50 dark:text-red-300">
            {s.authError}
          </p>
        )}

        <button
          type="submit"
          disabled={s.authBusy}
          className="mt-4 w-full rounded-2xl bg-brand-600 py-3.5 font-bold text-white disabled:opacity-50"
        >
          {s.authBusy ? 'صبر کن…' : mode === 'login' ? 'ورود به دوینو' : 'ساخت حساب'}
        </button>
        <p className="mt-3 text-center text-[11px] text-gray-400" dir="ltr">
          {serverBase()}
        </p>
      </form>
    </div>
  );
}

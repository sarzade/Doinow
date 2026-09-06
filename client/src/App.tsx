import { useEffect, useMemo, useState } from 'react';
import BottomNav from './components/BottomNav';
import MonthCalendar from './components/MonthCalendar';
import QuickAddBar from './components/QuickAddBar';
import TaskDetail from './components/TaskDetail';
import TaskItem from './components/TaskItem';
import type { Task } from './lib/api';
import { serverBase } from './lib/api';
import {
  addDays,
  formatGregorianSmall,
  formatJalali,
  formatJalaliWeekday,
  startOfDay,
  toFaDigits,
} from './lib/jalali';
import { expandDay, expandRange, somedayTasks, type OccurrenceItem } from './lib/expand';
import { effectiveRule } from './lib/recurrence';
import { useStore } from './store/useStore';

const LIST_COLORS = ['#7c3aed', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'];

type DetailState = { mode: 'closed' } | { mode: 'new'; listId: string | null } | { mode: 'edit'; task: Task };

export default function App() {
  const s = useStore();
  const [detail, setDetail] = useState<DetailState>({ mode: 'closed' });
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
    return (id: string | null): string | undefined => (id ? m.get(id) : undefined);
  }, [s.lists]);

  function toggleSmart(item: OccurrenceItem): void {
    const rule = effectiveRule(item.task);
    if (rule && !item.task.isDone && item.date) {
      void s.completeOccurrence(item.task.id, item.date.toISOString());
    } else {
      void s.toggleTask(item.task.id);
    }
  }

  function openEdit(t: Task): void {
    setDetail({ mode: 'edit', task: t });
  }

  if (!s.booted) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-600 text-3xl font-black text-white">
            د
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
              <p className="mt-0.5 text-[11px] text-gray-400">{formatJalaliWeekday(new Date())}</p>
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
            <button
              type="button"
              onClick={() => s.setTab('settings')}
              aria-label="تنظیمات"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 8.5A3.5 3.5 0 1012 15.5 3.5 3.5 0 0012 8.5zM20 12a8 8 0 01-.2 1.7l2 1.6-2 3.4-2.4-1a8 8 0 01-2.9 1.7L14 21h-4l-.5-2.6a8 8 0 01-2.9-1.7l-2.4 1-2-3.4 2-1.6A8 8 0 014 12c0-.6.1-1.1.2-1.7l-2-1.6 2-3.4 2.4 1a8 8 0 012.9-1.7L10 3h4l.5 2.6a8 8 0 012.9 1.7l2.4-1 2 3.4-2 1.6c.1.6.2 1.1.2 1.7z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
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

        {s.tab === 'myday' && <MyDayView listName={listName} onToggle={toggleSmart} onOpen={openEdit} />}
        {s.tab === 'week' && <WeekView listName={listName} onToggle={toggleSmart} onOpen={openEdit} />}
        {s.tab === 'all' && <AllView listName={listName} onToggle={toggleSmart} onOpen={openEdit} />}
        {s.tab === 'lists' && (
          <ListsView
            listName={listName}
            query={query}
            setQuery={setQuery}
            activeListId={activeListId}
            setActiveListId={setActiveListId}
            newListName={newListName}
            setNewListName={setNewListName}
            onToggle={toggleSmart}
            onOpen={openEdit}
          />
        )}
        {s.tab === 'calendar' && (
          <CalendarView
            listName={listName}
            calDay={calDay}
            setCalDay={setCalDay}
            onToggle={toggleSmart}
            onOpen={openEdit}
          />
        )}
        {s.tab === 'settings' && <SettingsView />}
      </main>

      {s.tab !== 'settings' && (
        <button
          type="button"
          onClick={() => setDetail({ mode: 'new', listId: s.tab === 'lists' ? activeListId : null })}
          aria-label="تسک جدید"
          className="fixed bottom-20 left-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-3xl text-white shadow-lg"
        >
          +
        </button>
      )}

      <BottomNav tab={s.tab === 'settings' ? 'myday' : s.tab} onChange={s.setTab} />

      {detail.mode === 'new' && (
        <TaskDetail task={null} defaultListId={detail.listId} onClose={() => setDetail({ mode: 'closed' })} />
      )}
      {detail.mode === 'edit' && (
        <TaskDetail
          key={detail.task.id + detail.task.updatedAt}
          task={useStore.getState().tasks.find((t) => t.id === detail.task.id) ?? detail.task}
          onClose={() => setDetail({ mode: 'closed' })}
        />
      )}
    </div>
  );
}

/* ---------- لیست وقوع‌ها ---------- */

function OccList({
  items,
  listName,
  empty,
  onToggle,
  onOpen,
}: {
  items: OccurrenceItem[];
  listName: (id: string | null) => string | undefined;
  empty: string;
  onToggle: (item: OccurrenceItem) => void;
  onOpen: (t: Task) => void;
}) {
  if (items.length === 0) return <p className="py-6 text-center text-sm text-gray-400">{empty}</p>;
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <TaskItem
          key={it.task.id + (it.date ? it.date.toISOString() : 'nodate')}
          task={it.task}
          listTitle={listName(it.task.listId)}
          dateISO={it.date ? it.date.toISOString() : null}
          onToggle={() => onToggle(it)}
          onOpen={() => onOpen(it.task)}
        />
      ))}
    </div>
  );
}

/* ---------- روز من ---------- */

function MyDayView({
  listName,
  onToggle,
  onOpen,
}: {
  listName: (id: string | null) => string | undefined;
  onToggle: (item: OccurrenceItem) => void;
  onOpen: (t: Task) => void;
}) {
  const tasks = useStore((x) => x.tasks);
  const flagged = useMemo(
    () =>
      tasks
        .filter((t) => t.myDay && !t.isDone)
        .map((t): OccurrenceItem => ({
          task: t,
          date: t.dueDate ? new Date(t.dueDate) : null,
          overdue: false,
        })),
    [tasks],
  );
  const today = useMemo(() => {
    const items = expandDay(tasks, new Date());
    const flaggedIds = new Set(flagged.map((f) => f.task.id));
    return items.filter((it) => !flaggedIds.has(it.task.id));
  }, [tasks, flagged]);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-l from-brand-600 to-violet-500 p-4 text-white">
        <div className="text-sm opacity-80">{formatGregorianSmall(new Date())}</div>
        <div className="text-xl font-black">{formatJalaliWeekday(new Date())}</div>
        <div className="mt-1 text-sm opacity-90">
          {toFaDigits(flagged.length + today.length)} کار برای امروز
        </div>
      </div>

      {flagged.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-black text-brand-600">◎ روز من</h3>
          <OccList items={flagged} listName={listName} empty="" onToggle={onToggle} onOpen={onOpen} />
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-black">امروز</h3>
        <OccList
          items={today}
          listName={listName}
          empty="برای امروز چیزی نیست."
          onToggle={onToggle}
          onOpen={onOpen}
        />
      </div>

      <QuickAddBar />
    </section>
  );
}

/* ---------- ۷ روز آینده ---------- */

function WeekView({
  listName,
  onToggle,
  onOpen,
}: {
  listName: (id: string | null) => string | undefined;
  onToggle: (item: OccurrenceItem) => void;
  onOpen: (t: Task) => void;
}) {
  const tasks = useStore((x) => x.tasks);
  const days = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(startOfDay(now), i);
      return { day: d, items: expandDay(tasks, d, now) };
    });
  }, [tasks]);

  return (
    <section className="space-y-4">
      {days.map(({ day, items }, i) => (
        <div key={day.toISOString()}>
          <h3 className="mb-2 text-sm font-black">
            {i === 0 ? 'امروز' : i === 1 ? 'فردا' : formatJalaliWeekday(day)}
            <span className="mr-2 text-[11px] font-normal text-gray-400">
              {formatJalali(day)} • {formatGregorianSmall(day)}
            </span>
          </h3>
          <OccList
            items={items}
            listName={listName}
            empty="—"
            onToggle={onToggle}
            onOpen={onOpen}
          />
        </div>
      ))}
    </section>
  );
}

/* ---------- همه تسک‌ها ---------- */

function AllView({
  listName,
  onToggle,
  onOpen,
}: {
  listName: (id: string | null) => string | undefined;
  onToggle: (item: OccurrenceItem) => void;
  onOpen: (t: Task) => void;
}) {
  const tasks = useStore((x) => x.tasks);
  const now = new Date();
  const todayItems = useMemo(() => expandDay(tasks, now), [tasks]);
  const tomorrowItems = useMemo(() => expandDay(tasks, addDays(now, 1), now), [tasks]);
  const upcomingItems = useMemo(() => {
    const from = startOfDay(addDays(now, 2));
    const to = addDays(startOfDay(now), 7);
    to.setHours(23, 59, 59, 999);
    return expandRange(tasks, from, to, now);
  }, [tasks]);
  const someday = useMemo(() => somedayTasks(tasks), [tasks]);
  const done = useMemo(() => tasks.filter((t) => t.isDone), [tasks]);

  return (
    <section className="space-y-5">
      <Section title="امروز">
        <OccList items={todayItems} listName={listName} empty="خالی" onToggle={onToggle} onOpen={onOpen} />
      </Section>
      <Section title="فردا">
        <OccList items={tomorrowItems} listName={listName} empty="خالی" onToggle={onToggle} onOpen={onOpen} />
      </Section>
      <Section title="آینده">
        <OccList items={upcomingItems} listName={listName} empty="خالی" onToggle={onToggle} onOpen={onOpen} />
      </Section>
      <Section title="یه روز">
        {someday.length === 0 ? (
          <p className="py-2 text-center text-sm text-gray-400">خالی</p>
        ) : (
          <div className="space-y-2">
            {someday.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                listTitle={listName(t.listId)}
                dateISO={null}
                onToggle={() => onToggle({ task: t, date: null, overdue: false })}
                onOpen={() => onOpen(t)}
              />
            ))}
          </div>
        )}
      </Section>
      {done.length > 0 && (
        <Section title={`انجام‌شده (${toFaDigits(done.length)})`}>
          <div className="space-y-2 opacity-70">
            {done.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                listTitle={listName(t.listId)}
                onToggle={() => onToggle({ task: t, date: null, overdue: false })}
                onOpen={() => onOpen(t)}
              />
            ))}
          </div>
        </Section>
      )}
      <QuickAddBar />
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-[15px] font-black text-brand-600 dark:text-brand-100">{title}</h3>
      {children}
    </div>
  );
}

/* ---------- لیست‌ها: جستجو + بنر + گرید ---------- */

function ListsView({
  listName,
  query,
  setQuery,
  activeListId,
  setActiveListId,
  newListName,
  setNewListName,
  onToggle,
  onOpen,
}: {
  listName: (id: string | null) => string | undefined;
  query: string;
  setQuery: (q: string) => void;
  activeListId: string | null;
  setActiveListId: (id: string | null) => void;
  newListName: string;
  setNewListName: (v: string) => void;
  onToggle: (item: OccurrenceItem) => void;
  onOpen: (t: Task) => void;
}) {
  const s = useStore();
  const now = new Date();

  const searchResults = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return s.tasks
      .filter((t) => t.title.includes(q) || t.note.includes(q) || t.tags.some((tag) => tag.includes(q)))
      .slice(0, 50)
      .map((t): OccurrenceItem => ({ task: t, date: t.dueDate ? new Date(t.dueDate) : null, overdue: false }));
  }, [s.tasks, query]);

  const todayCount = useMemo(() => expandDay(s.tasks, now).length, [s.tasks]);
  const nextReminder = useMemo(() => {
    const withRem = s.tasks
      .filter((t) => !t.isDone && t.reminderAt && new Date(t.reminderAt).getTime() > now.getTime())
      .sort((a, b) => (a.reminderAt as string) < (b.reminderAt as string) ? -1 : 1);
    return withRem[0] ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.tasks]);

  const countOpen = (listId: string | null): number =>
    s.tasks.filter((t) => !t.isDone && (t.listId ?? null) === listId).length;

  // '__none__' یعنی نمای تسک‌های بی‌لیست
  const showingNone = activeListId === '__none__';
  const activeList = showingNone
    ? { id: '__none__', title: 'بدون لیست', color: '#9ca3af' }
    : (activeListId ? s.lists.find((l) => l.id === activeListId) ?? null : null);
  const activeFilterId = showingNone ? null : activeListId;

  return (
    <section className="space-y-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="جستجوی تسک، یادداشت، تگ…"
        className="w-full rounded-full border border-gray-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900"
      />

      {query.trim() !== '' ? (
        <OccList
          items={searchResults}
          listName={listName}
          empty="چیزی پیدا نشد."
          onToggle={onToggle}
          onOpen={onOpen}
        />
      ) : activeList ? (
        <div>
          <button
            type="button"
            onClick={() => setActiveListId(null)}
            className="mb-2 text-sm text-brand-600"
          >
            → همه لیست‌ها
          </button>
          <h2 className="mb-2 flex items-center gap-2 text-lg font-black">
            <span className="h-3 w-3 rounded-full" style={{ background: activeList.color }} />
            {activeList.title}
          </h2>
          <OccList
            items={s.tasks
              .filter((t) => (t.listId ?? null) === activeFilterId)
              .sort((a, b) => Number(a.isDone) - Number(b.isDone))
              .map((t): OccurrenceItem => ({
                task: t,
                date: t.dueDate ? new Date(t.dueDate) : null,
                overdue: false,
              }))}
            listName={listName}
            empty="این لیست خالی است."
            onToggle={onToggle}
            onOpen={onOpen}
          />
          <div className="mt-3">
            <QuickAddBar defaultListId={activeFilterId} />
          </div>
          {!showingNone && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`لیست «${activeList.title}» حذف شود؟ تسک‌هایش بی‌لیست می‌شوند.`)) {
                  void s.deleteList(activeList.id);
                  setActiveListId(null);
                }
              }}
              className="mt-3 w-full rounded-2xl bg-red-50 py-2.5 text-sm font-bold text-red-600 dark:bg-red-950/40 dark:text-red-400"
            >
              حذف لیست
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-2xl bg-gradient-to-l from-sky-600 to-brand-600 p-4 text-white">
            <div className="text-lg font-black">امروز {toFaDigits(todayCount)} کار داری</div>
            <div className="mt-1 text-sm opacity-90">
              {nextReminder && nextReminder.reminderAt
                ? `نزدیک‌ترین یادآور: ${nextReminder.title} • ${formatJalali(nextReminder.reminderAt)}`
                : 'یادآوری تنظیم نشده.'}
            </div>
          </div>

          <h2 className="pt-1 text-lg font-black text-brand-600 dark:text-brand-100">لیست‌های من</h2>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setActiveListId('__none__')}
              className="relative rounded-2xl bg-gray-200 p-4 py-8 text-center font-bold dark:bg-gray-800"
            >
              بدون لیست
              {countOpen(null) > 0 && (
                <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/30 text-xs">
                  {toFaDigits(countOpen(null))}
                </span>
              )}
            </button>
            {s.lists.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setActiveListId(l.id)}
                className="relative rounded-2xl bg-gray-200 p-4 py-8 text-center font-bold dark:bg-gray-800"
              >
                <span className="mx-auto mb-1 block h-2 w-8 rounded-full" style={{ background: l.color }} />
                {l.title}
                {countOpen(l.id) > 0 && (
                  <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/30 text-xs">
                    {toFaDigits(countOpen(l.id))}
                  </span>
                )}
              </button>
            ))}
            <div className="flex items-center gap-1.5 rounded-2xl bg-gray-200 p-2 dark:bg-gray-800">
              <input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newListName.trim()) {
                    void s.createList(newListName.trim(), LIST_COLORS[s.lists.length % LIST_COLORS.length]);
                    setNewListName('');
                  }
                }}
                placeholder="لیست جدید…"
                className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newListName.trim()) return;
                  void s.createList(newListName.trim(), LIST_COLORS[s.lists.length % LIST_COLORS.length]);
                  setNewListName('');
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-brand-600"
                aria-label="ساخت لیست"
              >
                +
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

/* ---------- تقویم ---------- */

function CalendarView({
  listName,
  calDay,
  setCalDay,
  onToggle,
  onOpen,
}: {
  listName: (id: string | null) => string | undefined;
  calDay: string | null;
  setCalDay: (d: string | null) => void;
  onToggle: (item: OccurrenceItem) => void;
  onOpen: (t: Task) => void;
}) {
  const tasks = useStore((x) => x.tasks);
  const calTasks = useMemo(() => {
    if (!calDay) return [];
    return expandDay(tasks, new Date(calDay));
  }, [tasks, calDay]);

  return (
    <section className="space-y-3">
      <MonthCalendar tasks={tasks} selectedDay={calDay} onSelectDay={setCalDay} />
      {calDay && (
        <div>
          <h3 className="mb-2 text-sm font-bold">کارهای {formatJalali(calDay)}</h3>
          <OccList
            items={calTasks}
            listName={listName}
            empty="در این روز کاری ثبت نشده."
            onToggle={onToggle}
            onOpen={onOpen}
          />
        </div>
      )}
    </section>
  );
}

/* ---------- تنظیمات ---------- */

function SettingsView() {
  const s = useStore();
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

/* ---------- ورود ---------- */

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

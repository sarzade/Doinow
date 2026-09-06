import { create } from 'zustand';
import type {
  Priority,
  Recurrence,
  Task,
  TaskInput,
  TaskList,
  User,
} from '../lib/api';
import {
  ApiError,
  apiCreateList,
  apiCreateTask,
  apiDeleteList,
  apiDeleteTask,
  apiGetState,
  apiLogin,
  apiMe,
  apiRegister,
  apiToggleSubtask,
  apiUpdateList,
  apiUpdateTask,
  getToken,
  setToken,
} from '../lib/api';
import { cancelReminder, scheduleReminder } from '../lib/notify';
import { effectiveRule } from '../lib/recurrence';
import { shiftByRecurrence } from '../lib/jalali';

export type Tab = 'myday' | 'week' | 'all' | 'lists' | 'calendar' | 'settings';
export type Theme = 'light' | 'dark';

type OpKind =
  | 'create-task'
  | 'update-task'
  | 'delete-task'
  | 'create-list'
  | 'update-list'
  | 'delete-list'
  | 'toggle-subtask';

interface OutboxOp {
  id: string;
  kind: OpKind;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  tempId?: string;
}

const CACHE_KEY = 'doinow_cache_v1';
const OUTBOX_KEY = 'doinow_outbox_v1';
const THEME_KEY = 'doinow_theme';

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadCache(): { lists: TaskList[]; tasks: Task[] } {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { lists: [], tasks: [] };
    const p = JSON.parse(raw) as { lists: TaskList[]; tasks: Task[] };
    return { lists: p.lists ?? [], tasks: p.tasks ?? [] };
  } catch {
    return { lists: [], tasks: [] };
  }
}

function saveCache(lists: TaskList[], tasks: Task[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ lists, tasks }));
  } catch {
    /* حافظه پر است */
  }
}

function loadOutbox(): OutboxOp[] {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? '[]') as OutboxOp[];
  } catch {
    return [];
  }
}

function saveOutbox(ops: OutboxOp[]): void {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(ops));
  } catch {
    /* نادیده */
  }
}

function applyTheme(t: Theme): void {
  document.documentElement.classList.toggle('dark', t === 'dark');
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* نادیده */
  }
}

function isNetworkError(e: unknown): boolean {
  return e instanceof ApiError && e.status === 0;
}

interface Store {
  booted: boolean;
  user: User | null;
  authBusy: boolean;
  authError: string | null;

  lists: TaskList[];
  tasks: Task[];
  syncing: boolean;
  lastSync: string | null;
  offline: boolean;
  error: string | null;
  pendingOps: number;

  tab: Tab;
  theme: Theme;

  boot: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, displayName: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;

  setTab: (t: Tab) => void;
  toggleTheme: () => void;
  syncNow: () => Promise<void>;

  createList: (title: string, color: string) => Promise<void>;
  updateList: (id: string, patch: { title?: string; color?: string }) => Promise<void>;
  deleteList: (id: string) => Promise<void>;

  createTask: (input: TaskInput) => Promise<void>;
  updateTask: (id: string, patch: Partial<TaskInput> & { isDone?: boolean }) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  /** تکمیل یک وقوع مشخص از تسک تکرارشونده */
  completeOccurrence: (id: string, occurrenceISO: string) => Promise<void>;
  /** افزودن/حذف از «روز من» */
  toggleMyDay: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  exportBackup: () => void;
}

export const useStore = create<Store>((set, get) => {
  function persist(): void {
    const { lists, tasks } = get();
    saveCache(lists, tasks);
  }

  function enqueue(op: OutboxOp): void {
    const ops = [...loadOutbox(), op];
    saveOutbox(ops);
    set({ pendingOps: ops.length, offline: true });
  }

  function replaceTempId(tempId: string, realId: string): void {
    const ops = loadOutbox().map((o) => {
      const raw = JSON.stringify(o.payload).split(tempId).join(realId);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const payload = JSON.parse(raw);
      return {
        ...o,
        payload,
        tempId: o.tempId === tempId ? undefined : o.tempId,
      };
    });
    saveOutbox(ops);
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === tempId ? { ...t, id: realId } : t,
      ),
      lists: s.lists.map((l) =>
        l.id === tempId ? { ...l, id: realId } : l,
      ),
    }));
  }

  async function flushOutbox(): Promise<void> {
    let ops = loadOutbox();
    while (ops.length > 0) {
      const [op, ...rest] = ops;
      try {
        if (op.kind === 'create-task') {
          const created = await apiCreateTask(op.payload as TaskInput);
          if (op.tempId) replaceTempId(op.tempId, created.id);
          set((s) => ({
            tasks: s.tasks.some((t) => t.id === created.id)
              ? s.tasks.map((t) => (t.id === created.id ? created : t))
              : [...s.tasks.filter((t) => t.id !== op.tempId), created],
          }));
          if (created.reminderAt)
            void scheduleReminder(created.id, created.title, new Date(created.reminderAt));
        } else if (op.kind === 'update-task') {
          const { id, patch } = op.payload as {
            id: string;
            patch: Partial<TaskInput> & { isDone?: boolean };
          };
          const updated = await apiUpdateTask(id, patch);
          set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }));
          if (updated.reminderAt && !updated.isDone)
            void scheduleReminder(updated.id, updated.title, new Date(updated.reminderAt));
          else void cancelReminder(id);
        } else if (op.kind === 'delete-task') {
          await apiDeleteTask(op.payload.id as string);
          void cancelReminder(op.payload.id as string);
        } else if (op.kind === 'create-list') {
          const created = await apiCreateList(
            op.payload as { title: string; color: string },
          );
          if (op.tempId) replaceTempId(op.tempId, created.id);
          set((s) => ({
            lists: s.lists.some((l) => l.id === created.id)
              ? s.lists.map((l) => (l.id === created.id ? created : l))
              : [...s.lists.filter((l) => l.id !== op.tempId), created],
          }));
        } else if (op.kind === 'update-list') {
          const { id, patch } = op.payload as {
            id: string;
            patch: { title?: string; color?: string };
          };
          const updated = await apiUpdateList(id, patch);
          set((s) => ({ lists: s.lists.map((l) => (l.id === id ? updated : l)) }));
        } else if (op.kind === 'delete-list') {
          await apiDeleteList(op.payload.id as string);
        } else if (op.kind === 'toggle-subtask') {
          const { taskId, subtaskId } = op.payload as {
            taskId: string;
            subtaskId: string;
          };
          const updated = await apiToggleSubtask(taskId, subtaskId);
          set((s) => ({
            tasks: s.tasks.map((t) => (t.id === taskId ? updated : t)),
          }));
        }
      } catch (e) {
        if (isNetworkError(e)) {
          saveOutbox([op, ...rest]);
          set({ pendingOps: rest.length + 1, offline: true });
          return;
        }
        // خطای منطقی (مثلا رکورد پاک شده): این op را دور می‌اندازیم
      }
      ops = loadOutbox().filter((o) => o.id !== op.id);
      // replaceTempId ممکن است outbox را بازنویسی کرده باشد؛ دوباره بخوان
      if (op.tempId) ops = loadOutbox().filter((o) => o.id !== op.id);
      saveOutbox(ops);
      set({ pendingOps: ops.length });
    }
    set({ offline: false });
    persist();
  }

  return {
    booted: false,
    user: null,
    authBusy: false,
    authError: null,

    lists: [],
    tasks: [],
    syncing: false,
    lastSync: null,
    offline: false,
    error: null,
    pendingOps: loadOutbox().length,

    tab: 'myday',
    theme: 'dark',

    boot: async () => {
      const savedTheme = (() => {
        try {
          return (localStorage.getItem(THEME_KEY) as Theme | null) ?? 'dark';
        } catch {
          return 'dark' as Theme;
        }
      })();
      applyTheme(savedTheme);
      set({ theme: savedTheme });

      const cache = loadCache();
      set({ lists: cache.lists, tasks: cache.tasks });

      const token = await getToken();
      if (!token) {
        set({ booted: true });
        return;
      }
      try {
        const { user } = await apiMe();
        set({ user });
        await get().syncNow();
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          await setToken(null);
          set({ user: null });
        } else {
          set({ offline: true });
        }
      }
      set({ booted: true });
    },

    login: async (email, password) => {
      set({ authBusy: true, authError: null });
      try {
        const res = await apiLogin(email, password);
        await setToken(res.accessToken);
        try {
          localStorage.setItem('doinow_refresh', res.refreshToken);
        } catch {
          /* نادیده */
        }
        set({ user: res.user, authBusy: false });
        await get().syncNow();
        return true;
      } catch (e) {
        set({
          authBusy: false,
          authError: e instanceof ApiError ? e.message : 'خطای ورود',
        });
        return false;
      }
    },

    register: async (email, password, displayName) => {
      set({ authBusy: true, authError: null });
      try {
        const res = await apiRegister(email, password, displayName);
        await setToken(res.accessToken);
        try {
          localStorage.setItem('doinow_refresh', res.refreshToken);
        } catch {
          /* نادیده */
        }
        set({ user: res.user, authBusy: false });
        await get().syncNow();
        return true;
      } catch (e) {
        set({
          authBusy: false,
          authError: e instanceof ApiError ? e.message : 'خطای ثبت‌نام',
        });
        return false;
      }
    },

    logout: async () => {
      await setToken(null);
      try {
        localStorage.removeItem('doinow_refresh');
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(OUTBOX_KEY);
      } catch {
        /* نادیده */
      }
      set({ user: null, lists: [], tasks: [], pendingOps: 0, offline: false });
    },

    clearError: () => set({ error: null, authError: null }),

    setTab: (tab) => set({ tab }),

    toggleTheme: () => {
      const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      set({ theme: next });
    },

    syncNow: async () => {
      if (!get().user) return;
      set({ syncing: true, error: null });
      try {
        await flushOutbox();
        const state = await apiGetState();
        set({
          lists: state.lists,
          tasks: state.tasks,
          lastSync: state.serverTime,
          syncing: false,
          offline: false,
        });
        persist();
      } catch (e) {
        set({
          syncing: false,
          offline: isNetworkError(e) ? true : get().offline,
          error:
            e instanceof ApiError && e.status !== 0 ? e.message : get().error,
        });
      }
    },

    createList: async (title, color) => {
      const now = new Date().toISOString();
      const tempId = uid('tmp');
      const optimistic: TaskList = {
        id: tempId,
        title,
        color,
        createdAt: now,
        updatedAt: now,
      };
      try {
        const created = await apiCreateList({ title, color });
        set((s) => ({ lists: [...s.lists, created] }));
        persist();
      } catch (e) {
        if (!isNetworkError(e)) {
          set({ error: e instanceof ApiError ? e.message : 'خطا' });
          return;
        }
        set((s) => ({ lists: [...s.lists, optimistic] }));
        enqueue({ id: uid('op'), kind: 'create-list', payload: { title, color }, tempId });
        persist();
      }
    },

    updateList: async (id, patch) => {
      const prev = get().lists;
      set((s) => ({ lists: s.lists.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
      try {
        const updated = await apiUpdateList(id, patch);
        set((s) => ({ lists: s.lists.map((l) => (l.id === id ? updated : l)) }));
        persist();
      } catch (e) {
        if (!isNetworkError(e)) {
          set({ lists: prev, error: e instanceof ApiError ? e.message : 'خطا' });
          return;
        }
        enqueue({ id: uid('op'), kind: 'update-list', payload: { id, patch } });
        persist();
      }
    },

    deleteList: async (id) => {
      const prev = get();
      set((s) => ({
        lists: s.lists.filter((l) => l.id !== id),
        tasks: s.tasks.map((t) => (t.listId === id ? { ...t, listId: null } : t)),
      }));
      try {
        await apiDeleteList(id);
        persist();
      } catch (e) {
        if (!isNetworkError(e)) {
          set({ lists: prev.lists, tasks: prev.tasks, error: e instanceof ApiError ? e.message : 'خطا' });
          return;
        }
        enqueue({ id: uid('op'), kind: 'delete-list', payload: { id } });
        persist();
      }
    },

    createTask: async (input) => {
      const now = new Date().toISOString();
      const tempId = uid('tmp');
      const optimistic: Task = {
        id: tempId,
        listId: input.listId ?? null,
        title: input.title,
        note: input.note ?? '',
        dueDate: input.dueDate ?? null,
        reminderAt: input.reminderAt ?? null,
        priority: input.priority ?? 4,
        tags: input.tags ?? [],
        isDone: false,
        recurrence: input.recurrence ?? 'none',
        recurrenceRule: input.recurrenceRule ?? null,
        lastCompletedAt: null,
        myDay: input.myDay ?? false,
        myDayDate: input.myDayDate ?? null,
        subtasks: (input.subtasks ?? []).map((s) => ({
          id: uid('sub'),
          title: s.title,
          isDone: s.isDone ?? false,
        })),
        createdAt: now,
        updatedAt: now,
      };
      try {
        const created = await apiCreateTask(input);
        set((s) => ({ tasks: [created, ...s.tasks] }));
        if (created.reminderAt)
          void scheduleReminder(created.id, created.title, new Date(created.reminderAt));
        persist();
      } catch (e) {
        if (!isNetworkError(e)) {
          set({ error: e instanceof ApiError ? e.message : 'خطا' });
          return;
        }
        set((s) => ({ tasks: [optimistic, ...s.tasks] }));
        enqueue({ id: uid('op'), kind: 'create-task', payload: input, tempId });
        persist();
      }
    },

    updateTask: async (id, patch) => {
      const prev = get().tasks;
      const { subtasks, ...restPatch } = patch;
      set((s) => ({
        tasks: s.tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                ...restPatch,
                ...(subtasks
                  ? {
                      subtasks: subtasks.map((st) => ({
                        id: uid('sub'),
                        title: st.title,
                        isDone: st.isDone ?? false,
                      })),
                    }
                  : {}),
                updatedAt: new Date().toISOString(),
              }
            : t,
        ),
      }));
      try {
        const updated = await apiUpdateTask(id, patch);
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }));
        if (updated.reminderAt && !updated.isDone)
          void scheduleReminder(updated.id, updated.title, new Date(updated.reminderAt));
        else void cancelReminder(id);
        persist();
      } catch (e) {
        if (!isNetworkError(e)) {
          set({ tasks: prev, error: e instanceof ApiError ? e.message : 'خطا' });
          return;
        }
        enqueue({ id: uid('op'), kind: 'update-task', payload: { id, patch } });
        persist();
      }
    },

    toggleTask: async (id) => {
      const task = get().tasks.find((t) => t.id === id);
      if (!task) return;
      // قانون تکرار ساخت‌یافته: تیک = تکمیل وقوع جاری، تسک سر جایش می‌ماند
      if (effectiveRule(task) && !task.isDone) {
        await get().updateTask(id, { lastCompletedAt: new Date().toISOString() });
        return;
      }
      const willDone = !task.isDone;
      await get().updateTask(id, { isDone: willDone });
      // تسک تکرارشونده: ساخت نسخه بعدی
      if (willDone && task.recurrence !== 'none' && task.dueDate) {
        const nextDue = shiftByRecurrence(
          new Date(task.dueDate),
          task.recurrence as 'daily' | 'weekly' | 'monthly',
        );
        await get().createTask({
          listId: task.listId,
          title: task.title,
          note: task.note,
          dueDate: nextDue.toISOString(),
          reminderAt: null,
          priority: task.priority as Priority,
          tags: task.tags,
          recurrence: task.recurrence as Recurrence,
          subtasks: task.subtasks.map((s) => ({ title: s.title })),
        });
      }
    },

    completeOccurrence: async (id, occurrenceISO) => {
      await get().updateTask(id, { lastCompletedAt: occurrenceISO });
    },

    toggleMyDay: async (id) => {
      const task = get().tasks.find((t) => t.id === id);
      if (!task) return;
      if (task.myDay) {
        await get().updateTask(id, { myDay: false, myDayDate: null });
      } else {
        await get().updateTask(id, { myDay: true, myDayDate: new Date().toISOString() });
      }
    },

    deleteTask: async (id) => {
      const prev = get().tasks;
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
      void cancelReminder(id);
      try {
        await apiDeleteTask(id);
        persist();
      } catch (e) {
        if (!isNetworkError(e)) {
          set({ tasks: prev, error: e instanceof ApiError ? e.message : 'خطا' });
          return;
        }
        enqueue({ id: uid('op'), kind: 'delete-task', payload: { id } });
        persist();
      }
    },

    toggleSubtask: async (taskId, subtaskId) => {
      const prev = get().tasks;
      set((s) => ({
        tasks: s.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subtasks: t.subtasks.map((st) =>
                  st.id === subtaskId ? { ...st, isDone: !st.isDone } : st,
                ),
              }
            : t,
        ),
      }));
      try {
        const updated = await apiToggleSubtask(taskId, subtaskId);
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === taskId ? updated : t)) }));
        persist();
      } catch (e) {
        if (!isNetworkError(e)) {
          set({ tasks: prev, error: e instanceof ApiError ? e.message : 'خطا' });
          return;
        }
        enqueue({
          id: uid('op'),
          kind: 'toggle-subtask',
          payload: { taskId, subtaskId },
        });
        persist();
      }
    },

    exportBackup: () => {
      const { lists, tasks, user } = get();
      const blob = new Blob(
        [JSON.stringify({ app: 'doinow', version: 1, user, lists, tasks }, null, 2)],
        { type: 'application/json' },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `doinow-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
  };
});

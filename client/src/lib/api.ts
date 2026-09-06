import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import type { RecurrenceRule } from './recurrence';

const BASE =
  (import.meta.env.VITE_API_URL as string | undefined) || '/api/v1';

const TOKEN_KEY = 'doinow_token';
const isNative = Capacitor.isNativePlatform();

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function getToken(): Promise<string | null> {
  if (isNative) {
    const { value } = await Preferences.get({ key: TOKEN_KEY });
    return value;
  }
  return localStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string | null): Promise<void> {
  if (isNative) {
    if (token) await Preferences.set({ key: TOKEN_KEY, value: token });
    else await Preferences.remove({ key: TOKEN_KEY });
    return;
  }
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(0, 'اتصال به سرور برقرار نشد');
  }
  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
  } & T;
  if (!res.ok) {
    throw new ApiError(res.status, body.error ?? 'خطای سرور');
  }
  return body as T;
}

/* ---------- تایپ‌ها ---------- */

export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface TaskList {
  id: string;
  title: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export type Priority = 1 | 2 | 3 | 4;
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface SubTask {
  id: string;
  title: string;
  isDone: boolean;
}

export interface Task {
  id: string;
  listId: string | null;
  title: string;
  note: string;
  dueDate: string | null;
  reminderAt: string | null;
  priority: Priority;
  tags: string[];
  isDone: boolean;
  recurrence: Recurrence;
  /** قانون تکرار ساخت‌یافته (جدید) — null یعنی بدون تکرار */
  recurrenceRule: RecurrenceRule | null;
  lastCompletedAt: string | null;
  myDay: boolean;
  myDayDate: string | null;
  subtasks: SubTask[];
  createdAt: string;
  updatedAt: string;
}

export interface StatePayload {
  lists: TaskList[];
  tasks: Task[];
  serverTime: string;
}

export interface AuthPayload {
  user: User;
  accessToken: string;
  refreshToken: string;
}

/* ---------- احراز هویت ---------- */

export function apiRegister(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthPayload> {
  return req<AuthPayload>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  });
}

export function apiLogin(email: string, password: string): Promise<AuthPayload> {
  return req<AuthPayload>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function apiMe(): Promise<{ user: User }> {
  return req<{ user: User }>('/auth/me');
}

/* ---------- داده ---------- */

export function apiGetState(since?: string): Promise<StatePayload> {
  return req<StatePayload>(`/sync${since ? `?since=${encodeURIComponent(since)}` : ''}`);
}

export interface ListInput {
  title: string;
  color: string;
}

export function apiCreateList(input: ListInput): Promise<TaskList> {
  return req<TaskList>('/lists', { method: 'POST', body: JSON.stringify(input) });
}

export function apiUpdateList(id: string, input: Partial<ListInput>): Promise<TaskList> {
  return req<TaskList>(`/lists/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function apiDeleteList(id: string): Promise<void> {
  return req<void>(`/lists/${id}`, { method: 'DELETE' });
}

export interface TaskInput {
  listId?: string | null;
  title: string;
  note?: string;
  dueDate?: string | null;
  reminderAt?: string | null;
  priority?: Priority;
  tags?: string[];
  recurrence?: Recurrence;
  recurrenceRule?: RecurrenceRule | null;
  myDay?: boolean;
  myDayDate?: string | null;
  lastCompletedAt?: string | null;
  subtasks?: { title: string; isDone?: boolean }[];
}

export function apiCreateTask(input: TaskInput): Promise<Task> {
  return req<Task>('/tasks', { method: 'POST', body: JSON.stringify(input) });
}

export function apiUpdateTask(
  id: string,
  input: Partial<TaskInput> & { isDone?: boolean },
): Promise<Task> {
  return req<Task>(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function apiDeleteTask(id: string): Promise<void> {
  return req<void>(`/tasks/${id}`, { method: 'DELETE' });
}

export function apiToggleSubtask(taskId: string, subtaskId: string): Promise<Task> {
  return req<Task>(`/tasks/${taskId}/subtasks/${subtaskId}/toggle`, {
    method: 'POST',
  });
}

export function serverBase(): string {
  return BASE;
}

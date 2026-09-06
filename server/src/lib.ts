import { PrismaClient } from '@prisma/client';
import type { List, Task } from '@prisma/client';
import { randomUUID } from 'node:crypto';

export const prisma = new PrismaClient();

export interface SubTaskDTO {
  id: string;
  title: string;
  isDone: boolean;
}

/** قانون تکرار ساخت‌یافته — اعتبارسنجی کامل در routes.ts انجام می‌شود */
export type RecurrenceRuleJSON = Record<string, unknown> | null;

export function parseRule(raw: string): RecurrenceRuleJSON {
  try {
    const v: unknown = JSON.parse(raw);
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      const freq = (v as Record<string, unknown>)['freq'];
      if (typeof freq === 'string' && freq.length > 0)
        return v as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

export interface TaskDTO {
  id: string;
  listId: string | null;
  title: string;
  note: string;
  dueDate: string | null;
  reminderAt: string | null;
  priority: number;
  tags: string[];
  isDone: boolean;
  recurrence: string;
  recurrenceRule: RecurrenceRuleJSON;
  lastCompletedAt: string | null;
  myDay: boolean;
  myDayDate: string | null;
  subtasks: SubTaskDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface ListDTO {
  id: string;
  title: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

function parseJsonArray(raw: string): unknown[] {
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function toListDTO(l: List): ListDTO {
  return {
    id: l.id,
    title: l.title,
    color: l.color,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
}

export function toTaskDTO(t: Task): TaskDTO {
  const tags = parseJsonArray(t.tagsJson).filter(
    (x): x is string => typeof x === 'string',
  );
  const subtasks = parseJsonArray(t.subtasksJson)
    .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
    .map((s) => ({
      id: typeof s['id'] === 'string' ? (s['id'] as string) : randomUUID(),
      title: typeof s['title'] === 'string' ? (s['title'] as string) : '',
      isDone: s['isDone'] === true,
    }))
    .filter((s) => s.title.length > 0);
  return {
    id: t.id,
    listId: t.listId,
    title: t.title,
    note: t.note,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    reminderAt: t.reminderAt ? t.reminderAt.toISOString() : null,
    priority: t.priority,
    tags,
    isDone: t.isDone,
    recurrence: t.recurrence,
    recurrenceRule: parseRule(t.recurrenceJson),
    lastCompletedAt: t.lastCompletedAt ? t.lastCompletedAt.toISOString() : null,
    myDay: t.myDay,
    myDayDate: t.myDayDate ? t.myDayDate.toISOString() : null,
    subtasks,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export function newSubtaskId(): string {
  return randomUUID();
}

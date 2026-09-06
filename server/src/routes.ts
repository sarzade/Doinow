import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { newSubtaskId, prisma, toListDTO, toTaskDTO } from './lib.js';

const HEX_COLOR = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'رنگ نامعتبر');
const ISO_DATE = z
  .string()
  .datetime({ offset: true, message: 'تاریخ نامعتبر' })
  .nullable()
  .optional();
const RECURRENCE = z.enum(['none', 'daily', 'weekly', 'monthly']);

/** قانون تکرار ساخت‌یافته (نسخه پیشرفته) */
const recurrenceRuleSchema = z.object({
  freq: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  interval: z.number().int().min(1, 'بازه تکرار نامعتبر').max(365),
  byWeekday: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  monthlyMode: z.enum(['dayOfMonth', 'nthWeekday']).optional(),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'ساعت نامعتبر (HH:mm)')
    .optional(),
  start: z.string().datetime({ offset: true, message: 'تاریخ شروع نامعتبر' }),
  missed: z.enum(['keep', 'nextOnly']),
  end: z
    .union([
      z.object({ type: z.literal('never') }),
      z.object({
        type: z.literal('onDate'),
        date: z.string().datetime({ offset: true, message: 'تاریخ پایان نامعتبر' }),
      }),
      z.object({
        type: z.literal('after'),
        count: z.number().int().min(1).max(1000),
      }),
    ])
    .optional(),
});

export type RecurrenceRuleInput = z.infer<typeof recurrenceRuleSchema>;

/** پیام فارسی خطا — خطاهای داخل recurrenceRule را یکدست می‌کند */
function taskErrorMessage(err: z.ZodError): string {
  const first = err.issues[0];
  if (first && first.path.some((p) => p === 'recurrenceRule'))
    return 'قانون تکرار نامعتبر است';
  return first?.message ?? 'ورودی نامعتبر';
}

const subtaskInput = z.object({
  title: z.string().trim().min(1).max(200),
  isDone: z.boolean().optional(),
});

const taskInput = z.object({
  listId: z.string().min(1).nullable().optional(),
  title: z.string().trim().min(1, 'عنوان لازم است').max(300),
  note: z.string().max(5000).optional(),
  dueDate: ISO_DATE,
  reminderAt: ISO_DATE,
  priority: z.number().int().min(1).max(4).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  recurrence: RECURRENCE.optional(),
  recurrenceRule: recurrenceRuleSchema.nullable().optional(),
  myDay: z.boolean().optional(),
  myDayDate: ISO_DATE,
  lastCompletedAt: ISO_DATE,
  subtasks: z.array(subtaskInput).max(50).optional(),
});

function uid(req: { user: { sub: string } }): string {
  return req.user.sub;
}

async function assertListOwner(
  userId: string,
  listId: string | null | undefined,
): Promise<boolean> {
  if (!listId) return true;
  const l = await prisma.list.findFirst({ where: { id: listId, userId } });
  return l !== null;
}

/**
 * تعیین قانون نهایی تکرار:
 * - اگر recurrenceRule (حتی null برای پاک‌سازی) داده شده → همان
 * - وگرنه اگر recurrence ساده قدیمی داده شده → ترجمه به قانون
 * - وگرنه undefined یعنی بدون تغییر (در PATCH) — در POST یعنی بدون تکرار
 */
function resolveRule(
  recurrenceRule: RecurrenceRuleInput | null | undefined,
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | undefined,
  dueDate: string | null | undefined,
  isPatch: boolean,
): { json: string; legacy: string } | undefined {
  if (recurrenceRule !== undefined) {
    if (recurrenceRule === null) return { json: '{}', legacy: 'none' };
    return { json: JSON.stringify(recurrenceRule), legacy: recurrenceRule.freq };
  }
  if (recurrence === undefined) return isPatch ? undefined : { json: '{}', legacy: 'none' };
  if (recurrence === 'none') return { json: '{}', legacy: 'none' };
  const rule: Record<string, unknown> = {
    freq: recurrence,
    interval: 1,
    start: dueDate ?? new Date().toISOString(),
    missed: 'keep',
    end: { type: 'never' },
  };
  return { json: JSON.stringify(rule), legacy: recurrence };
}

export async function dataRoutes(app: FastifyInstance): Promise<void> {
  /* ---------- سینک: وضعیت کامل (مقیاس شخصی) ---------- */
  app.get('/sync', { onRequest: [app.authenticate] }, async (req, reply) => {
    const userId = uid(req);
    const [lists, tasks] = await Promise.all([
      prisma.list.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      prisma.task.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return reply.send({
      lists: lists.map(toListDTO),
      tasks: tasks.map(toTaskDTO),
      serverTime: new Date().toISOString(),
    });
  });

  /* ---------- لیست‌ها ---------- */
  app.post('/lists', { onRequest: [app.authenticate] }, async (req, reply) => {
    const userId = uid(req);
    const parsed = z
      .object({ title: z.string().trim().min(1).max(80), color: HEX_COLOR.optional() })
      .safeParse(req.body);
    if (!parsed.success)
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'ورودی نامعتبر' });
    const created = await prisma.list.create({
      data: { userId, title: parsed.data.title, color: parsed.data.color ?? '#7c3aed' },
    });
    return reply.code(201).send(toListDTO(created));
  });

  app.patch('/lists/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    const userId = uid(req);
    const { id } = req.params as { id: string };
    const parsed = z
      .object({
        title: z.string().trim().min(1).max(80).optional(),
        color: HEX_COLOR.optional(),
      })
      .safeParse(req.body);
    if (!parsed.success)
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'ورودی نامعتبر' });
    const found = await prisma.list.findFirst({ where: { id, userId } });
    if (!found) return reply.code(404).send({ error: 'لیست یافت نشد' });
    const updated = await prisma.list.update({ where: { id }, data: parsed.data });
    return reply.send(toListDTO(updated));
  });

  app.delete('/lists/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    const userId = uid(req);
    const { id } = req.params as { id: string };
    const found = await prisma.list.findFirst({ where: { id, userId } });
    if (!found) return reply.code(404).send({ error: 'لیست یافت نشد' });
    await prisma.$transaction([
      prisma.task.updateMany({ where: { listId: id, userId }, data: { listId: null } }),
      prisma.list.delete({ where: { id } }),
    ]);
    return reply.code(204).send();
  });

  /* ---------- تسک‌ها ---------- */
  app.post('/tasks', { onRequest: [app.authenticate] }, async (req, reply) => {
    const userId = uid(req);
    const parsed = taskInput.safeParse(req.body);
    if (!parsed.success)
      return reply.code(400).send({ error: taskErrorMessage(parsed.error) });
    const d = parsed.data;
    if (!(await assertListOwner(userId, d.listId)))
      return reply.code(400).send({ error: 'لیست نامعتبر است' });
    const rule = resolveRule(d.recurrenceRule, d.recurrence, d.dueDate ?? null, false) ?? {
      json: '{}',
      legacy: 'none',
    };

    const created = await prisma.task.create({
      data: {
        userId,
        listId: d.listId ?? null,
        title: d.title,
        note: d.note ?? '',
        dueDate: d.dueDate ? new Date(d.dueDate) : null,
        reminderAt: d.reminderAt ? new Date(d.reminderAt) : null,
        priority: d.priority ?? 4,
        tagsJson: JSON.stringify(d.tags ?? []),
        recurrence: rule.legacy,
        recurrenceJson: rule.json,
        lastCompletedAt: d.lastCompletedAt ? new Date(d.lastCompletedAt) : null,
        myDay: d.myDay ?? false,
        myDayDate: d.myDayDate ? new Date(d.myDayDate) : null,
        subtasksJson: JSON.stringify(
          (d.subtasks ?? []).map((s) => ({
            id: newSubtaskId(),
            title: s.title,
            isDone: s.isDone ?? false,
          })),
        ),
      },
    });
    return reply.code(201).send(toTaskDTO(created));
  });

  app.patch('/tasks/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    const userId = uid(req);
    const { id } = req.params as { id: string };
    const parsed = taskInput
      .partial()
      .extend({ isDone: z.boolean().optional() })
      .safeParse(req.body);
    if (!parsed.success)
      return reply.code(400).send({ error: taskErrorMessage(parsed.error) });
    const found = await prisma.task.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!found) return reply.code(404).send({ error: 'تسک یافت نشد' });
    const d = parsed.data;
    if (d.listId !== undefined && !(await assertListOwner(userId, d.listId)))
      return reply.code(400).send({ error: 'لیست نامعتبر است' });
    const rule = resolveRule(
      d.recurrenceRule,
      d.recurrence,
      d.dueDate !== undefined ? d.dueDate : (found.dueDate ? found.dueDate.toISOString() : null),
      true,
    );

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(d.listId !== undefined ? { listId: d.listId } : {}),
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(d.note !== undefined ? { note: d.note } : {}),
        ...(d.dueDate !== undefined
          ? { dueDate: d.dueDate ? new Date(d.dueDate) : null }
          : {}),
        ...(d.reminderAt !== undefined
          ? { reminderAt: d.reminderAt ? new Date(d.reminderAt) : null }
          : {}),
        ...(d.priority !== undefined ? { priority: d.priority } : {}),
        ...(d.tags !== undefined ? { tagsJson: JSON.stringify(d.tags) } : {}),
        ...(d.isDone !== undefined ? { isDone: d.isDone } : {}),
        ...(d.recurrence !== undefined || d.recurrenceRule !== undefined
          ? {
              recurrence: rule?.legacy ?? found.recurrence,
              recurrenceJson: rule?.json ?? found.recurrenceJson,
            }
          : {}),
        ...(d.lastCompletedAt !== undefined
          ? { lastCompletedAt: d.lastCompletedAt ? new Date(d.lastCompletedAt) : null }
          : {}),
        ...(d.myDay !== undefined ? { myDay: d.myDay } : {}),
        ...(d.myDayDate !== undefined
          ? { myDayDate: d.myDayDate ? new Date(d.myDayDate) : null }
          : {}),
        ...(d.subtasks !== undefined
          ? {
              subtasksJson: JSON.stringify(
                d.subtasks.map((s) => ({
                  id: newSubtaskId(),
                  title: s.title,
                  isDone: s.isDone ?? false,
                })),
              ),
            }
          : {}),
      },
    });
    return reply.send(toTaskDTO(updated));
  });

  app.delete('/tasks/:id', { onRequest: [app.authenticate] }, async (req, reply) => {
    const userId = uid(req);
    const { id } = req.params as { id: string };
    const found = await prisma.task.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!found) return reply.code(404).send({ error: 'تسک یافت نشد' });
    await prisma.task.update({ where: { id }, data: { deletedAt: new Date() } });
    return reply.code(204).send();
  });

  app.post(
    '/tasks/:id/subtasks/:subId/toggle',
    { onRequest: [app.authenticate] },
    async (req, reply) => {
      const userId = uid(req);
      const { id, subId } = req.params as { id: string; subId: string };
      const found = await prisma.task.findFirst({
        where: { id, userId, deletedAt: null },
      });
      if (!found) return reply.code(404).send({ error: 'تسک یافت نشد' });
      const dto = toTaskDTO(found);
      const hit = dto.subtasks.find((s) => s.id === subId);
      if (!hit) return reply.code(404).send({ error: 'زیرکار یافت نشد' });
      hit.isDone = !hit.isDone;
      const updated = await prisma.task.update({
        where: { id },
        data: { subtasksJson: JSON.stringify(dto.subtasks) },
      });
      return reply.send(toTaskDTO(updated));
    },
  );
}

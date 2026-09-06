import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Task } from './api';
import { effectiveRule, occurrences } from './recurrence';

const isNative = Capacitor.isNativePlatform();

/** هش ساده برای تبدیل id رشته‌ای به عدد نوتیفیکیشن */
export function notifIdFor(taskId: string): number {
  let h = 0;
  for (let i = 0; i < taskId.length; i++) {
    h = (h * 31 + taskId.charCodeAt(i)) | 0;
  }
  return Math.abs(h % 2000000000);
}

export async function ensureNotifPermission(): Promise<boolean> {
  if (!isNative) return false;
  try {
    const cur = await LocalNotifications.checkPermissions();
    if (cur.display === 'granted') return true;
    const next = await LocalNotifications.requestPermissions();
    return next.display === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleReminder(
  taskId: string,
  title: string,
  at: Date,
): Promise<void> {
  if (!isNative) return;
  if (at.getTime() <= Date.now()) return;
  try {
    const ok = await ensureNotifPermission();
    if (!ok) return;
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notifIdFor(taskId),
          title: 'دوینو',
          body: title,
          schedule: { at },
          sound: 'default',
        },
      ],
    });
  } catch {
    /* سکوت: یادآور نباید اپ را خراب کند */
  }
}

export async function cancelReminder(taskId: string): Promise<void> {
  if (!isNative) return;
  try {
    await LocalNotifications.cancel({
      notifications: [{ id: notifIdFor(taskId) }],
    });
  } catch {
    /* نادیده */
  }
}

/**
 * زمان‌بندی یادآور ۳ وقوع آینده هر تسک تکرارشونده‌ای که یادآور دارد.
 * (یادآور تسک قانون‌دار = «سر هر وقوع خبرم کن»)
 */
export async function rescheduleRecurring(tasks: Task[]): Promise<void> {
  if (!isNative) return;
  try {
    const ok = await ensureNotifPermission();
    if (!ok) return;
    const now = new Date();
    const horizon = new Date(now);
    horizon.setDate(horizon.getDate() + 14);
    const notifs: { id: number; title: string; body: string; schedule: { at: Date } }[] = [];
    for (const t of tasks) {
      if (t.isDone || !t.reminderAt) continue;
      const rule = effectiveRule(t);
      if (!rule) continue;
      const occs = occurrences(rule, now, horizon, { after: t.lastCompletedAt, limit: 3 });
      for (let i = 0; i < occs.length; i++) {
        const o = occs[i] as Date;
        if (o.getTime() <= Date.now()) continue;
        notifs.push({ id: notifIdFor(`${t.id}#${i}`), title: 'دوینو', body: t.title, schedule: { at: o } });
      }
      if (notifs.length >= 20) break;
    }
    if (notifs.length > 0) {
      await LocalNotifications.schedule({ notifications: notifs.slice(0, 20) });
    }
  } catch {
    /* سکوت: یادآور نباید اپ را خراب کند */
  }
}

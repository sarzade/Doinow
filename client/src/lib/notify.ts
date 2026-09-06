import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

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

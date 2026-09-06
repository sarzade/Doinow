import { jalaaliMonthLength, toGregorian, toJalaali } from 'jalaali-js';

export const FA_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export const FA_WEEKDAYS = [
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
  'شنبه',
];

export interface JDate {
  jy: number;
  jm: number;
  jd: number;
}

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toFaDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

export function gregorianToJalali(d: Date): JDate {
  const { jy, jm, jd } = toJalaali(d);
  return { jy, jm, jd };
}

/** ساخت Date لوکال از تاریخ شمسی (ساعت ۱۲ ظهر برای جلوگیری از شیفت تایم‌زون) */
export function jalaliToDate(jy: number, jm: number, jd: number): Date {
  const { gy, gm, gd } = toGregorian(jy, jm, jd);
  return new Date(gy, gm - 1, gd, 12, 0, 0, 0);
}

export function todayJalali(): JDate {
  return gregorianToJalali(new Date());
}

/** «۱۵ شهریور ۱۴۰۳» */
export function formatJalali(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '';
  const { jy, jm, jd } = gregorianToJalali(date);
  return `${toFaDigits(jd)} ${FA_MONTHS[jm - 1]} ${toFaDigits(jy)}`;
}

/** «جمعه ۱۵ شهریور» */
export function formatJalaliWeekday(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '';
  return `${FA_WEEKDAYS[date.getDay()]} ${formatJalali(date)}`;
}

/** نمایش فرعی میلادی: «Sep 6, 2026» */
export function formatGregorianSmall(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** ساعت به فارسی: «۱۴:۳۰» */
export function formatTimeFa(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '';
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return toFaDigits(`${h}:${m}`);
}

export function monthLength(jy: number, jm: number): number {
  return jalaaliMonthLength(jy, jm);
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

export function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isOverdue(due: string | null): boolean {
  if (!due) return false;
  const date = new Date(due);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < startOfDay(new Date()).getTime();
}

/** شیفت تاریخ برای تسک تکرارشونده */
export function shiftByRecurrence(
  d: Date,
  r: 'daily' | 'weekly' | 'monthly',
): Date {
  const c = new Date(d);
  if (r === 'daily') c.setDate(c.getDate() + 1);
  else if (r === 'weekly') c.setDate(c.getDate() + 7);
  else c.setMonth(c.getMonth() + 1);
  return c;
}

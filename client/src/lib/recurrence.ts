import { formatJalali, toFaDigits } from './jalali';

export type RecurFreq = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type MissedPolicy = 'keep' | 'nextOnly';

export interface RecurrenceEndNever {
  type: 'never';
}
export interface RecurrenceEndOnDate {
  type: 'onDate';
  date: string;
}
export interface RecurrenceEndAfter {
  type: 'after';
  count: number;
}
export type RecurrenceEnd = RecurrenceEndNever | RecurrenceEndOnDate | RecurrenceEndAfter;

export interface RecurrenceRule {
  freq: RecurFreq;
  interval: number;
  /** ایندکس شمسی روز هفته: ۰=شنبه … ۶=جمعه */
  byWeekday?: number[];
  monthlyMode?: 'dayOfMonth' | 'nthWeekday';
  /** ساعت وقوع «HH:mm» — پیش‌فرض ساعتِ شروع */
  time?: string;
  /** ISO شروع قانون */
  start: string;
  /** رفتار وقوع‌های انجام‌نشده گذشته */
  missed: MissedPolicy;
  end?: RecurrenceEnd;
}

/** نام کوتاه روزهای هفته شمسی، ایندکس ۰=شنبه */
export const FA_WEEKDAYS_SHORT = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
];

/** تبدیل getDay جاوااسکریپت (۰=یکشنبه) به ایندکس شمسی (۰=شنبه) */
export function shamsiWeekday(d: Date): number {
  return (d.getDay() + 1) % 7;
}

/** تبدیل ایندکس شمسی به getDay */
export function jsWeekday(shamsi: number): number {
  return (shamsi + 6) % 7;
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function diffDays(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);
}

function parseTime(rule: RecurrenceRule, fallback: Date): { h: number; m: number } {
  if (rule.time) {
    const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(rule.time);
    if (m) return { h: Number(m[1]), m: Number(m[2]) };
  }
  return { h: fallback.getHours(), m: fallback.getMinutes() };
}

function withTime(day: Date, h: number, m: number): Date {
  const c = new Date(day);
  c.setHours(h, m, 0, 0);
  return c;
}

function daysInMonth(y: number, mo: number): number {
  return new Date(y, mo + 1, 0).getDate();
}

function nthWeekdayOfMonth(y: number, mo: number, jsDay: number, nth: number): number | null {
  // nthمین jsDay ماه (nth از ۱) → شماره روز ماه یا null
  const first = new Date(y, mo, 1);
  const offset = (jsDay - first.getDay() + 7) % 7;
  const day = 1 + offset + (nth - 1) * 7;
  return day <= daysInMonth(y, mo) ? day : null;
}

export interface OccurrenceOptions {
  /** وقوع‌های ≤ این تاریخ حذف می‌شوند (مثلا lastCompletedAt) */
  after?: Date | string | null;
  limit?: number;
}

const MAX_ITER_DAYS = 20000;
const DEFAULT_LIMIT = 2000;

/**
 * بسط قانون تکرار به وقوع‌ها در بازه [from, to].
 * همه محاسبات با ساعت لوکال دستگاه انجام می‌شود.
 */
export function occurrences(
  rule: RecurrenceRule,
  from: Date | string,
  to: Date | string,
  opts?: OccurrenceOptions,
): Date[] {
  const fromD = typeof from === 'string' ? new Date(from) : from;
  const toD = typeof to === 'string' ? new Date(to) : to;
  if (Number.isNaN(fromD.getTime()) || Number.isNaN(toD.getTime()) || fromD > toD) return [];

  const start = new Date(rule.start);
  if (Number.isNaN(start.getTime())) return [];
  const { h, m } = parseTime(rule, start);
  const interval = Math.max(1, Math.floor(rule.interval));
  const afterT =
    opts?.after != null ? new Date(opts.after).getTime() : Number.NEGATIVE_INFINITY;
  const limit = opts?.limit ?? DEFAULT_LIMIT;

  const endDate = rule.end?.type === 'onDate' ? new Date(rule.end.date) : null;
  const endT = endDate && !Number.isNaN(endDate.getTime()) ? endDate.getTime() : Infinity;
  const maxCount = rule.end?.type === 'after' ? Math.max(1, rule.end.count) : Infinity;

  const startDay = startOfDay(start);
  const byWeekday =
    rule.freq === 'weekly'
      ? (rule.byWeekday?.length ? [...new Set(rule.byWeekday)] : [shamsiWeekday(start)])
      : [];
  const monthlyMode = rule.monthlyMode ?? 'dayOfMonth';
  const startDom = start.getDate();
  const startNth = Math.ceil(startDom / 7);
  const startJsDay = start.getDay();

  const out: Date[] = [];
  let produced = 0; // تعداد وقوع‌های شمرده‌شده از شروع قانون (برای end.after)
  // برای end.after باید از شروع بشماریم حتی اگر پنجره جلوتر باشد
  const iterFrom = rule.end?.type === 'after' ? new Date(startDay) : new Date(Math.max(startDay.getTime(), startOfDay(fromD).getTime() - 0));

  for (
    let i = 0;
    i < MAX_ITER_DAYS && out.length < limit && produced < maxCount;
    i++
  ) {
    const day = new Date(iterFrom);
    day.setDate(iterFrom.getDate() + i);
    if (day > toD && produced >= maxCount) break;
    if (day.getTime() > toD.getTime() + 86400000 * 366 && rule.end?.type !== 'after') {
      // پنجره تمام شده و شمارشِ after نداریم
      if (day > toD) break;
    }

    const dd = diffDays(startDay, day);
    if (dd < 0) continue;
    let match = false;

    if (rule.freq === 'daily') {
      match = dd % interval === 0;
    } else if (rule.freq === 'weekly') {
      const weekIdx = Math.floor(dd / 7);
      match = weekIdx % interval === 0 && byWeekday.includes(shamsiWeekday(day));
    } else if (rule.freq === 'monthly') {
      const months =
        (day.getFullYear() - start.getFullYear()) * 12 + (day.getMonth() - start.getMonth());
      if (months >= 0 && months % interval === 0) {
        if (monthlyMode === 'dayOfMonth') {
          const target = Math.min(startDom, daysInMonth(day.getFullYear(), day.getMonth()));
          match = day.getDate() === target;
        } else {
          const t = nthWeekdayOfMonth(day.getFullYear(), day.getMonth(), startJsDay, startNth);
          match = t !== null && day.getDate() === t;
        }
      }
    } else {
      const years = day.getFullYear() - start.getFullYear();
      if (years >= 0 && years % interval === 0) {
        const target = Math.min(startDom, daysInMonth(day.getFullYear(), start.getMonth()));
        match =
          day.getMonth() === start.getMonth() && day.getDate() === target;
      }
    }

    if (!match) {
      // توقف زودهنگام برای بازه‌های بدون after: اگر خیلی از پنجره گذشتیم
      if (rule.end?.type !== 'after' && day.getTime() > toD.getTime()) break;
      continue;
    }

    produced++;
    if (produced > maxCount) break;
    const occ = withTime(day, h, m);
    if (occ.getTime() > endT) break;
    if (occ < fromD || occ > toD) continue;
    if (occ.getTime() <= afterT) continue;
    out.push(occ);
  }
  return out;
}

/** نزدیک‌ترین وقوع بعد از تاریخ داده‌شده (exclusive) */
export function nextOccurrence(
  rule: RecurrenceRule,
  after: Date | string,
  opts?: { afterCompleted?: Date | string | null },
): Date | null {
  const afterD = typeof after === 'string' ? new Date(after) : after;
  const horizon = new Date(afterD);
  horizon.setFullYear(horizon.getFullYear() + 2);
  const list = occurrences(rule, afterD, horizon, {
    after: opts?.afterCompleted ?? null,
    limit: 1,
  });
  // occurrences بازه را شامل from می‌داند؛ وقوعِ دقیقاً مساوی after را حذف کن
  const afterT = afterD.getTime();
  const completedT =
    opts?.afterCompleted != null ? new Date(opts.afterCompleted).getTime() : Number.NEGATIVE_INFINITY;
  for (const o of list) {
    if (o.getTime() > afterT && o.getTime() > completedT) return o;
  }
  return null;
}

/** آیا تسک قانون تکرار معتبر دارد؟ */
export function parseRuleSafe(raw: unknown): RecurrenceRule | null {
  if (raw === null || raw === undefined) return null;
  const v: unknown = typeof raw === 'string' ? tryJson(raw) : raw;
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return null;
  const r = v as Record<string, unknown>;
  if (r['freq'] !== 'daily' && r['freq'] !== 'weekly' && r['freq'] !== 'monthly' && r['freq'] !== 'yearly')
    return null;
  if (typeof r['interval'] !== 'number' || typeof r['start'] !== 'string') return null;
  if (r['missed'] !== 'keep' && r['missed'] !== 'nextOnly') return null;
  return v as RecurrenceRule;
}

function tryJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/** ترجمه recurrence ساده قدیمی به قانون (سازگاری عقب‌رو) */
export function ruleFromLegacy(
  recurrence: string,
  dueDateISO: string | null,
): RecurrenceRule | null {
  if (recurrence === 'none' || recurrence === '') return null;
  if (recurrence !== 'daily' && recurrence !== 'weekly' && recurrence !== 'monthly')
    return null;
  return {
    freq: recurrence,
    interval: 1,
    start: dueDateISO ?? new Date().toISOString(),
    missed: 'keep',
    end: { type: 'never' },
  };
}

/** قانون مؤثر تسک: قانون جدید، وگرنه ترجمه حالت قدیمی */
export function effectiveRule(task: {
  recurrenceRule?: RecurrenceRule | null;
  recurrence?: string;
  dueDate?: string | null;
}): RecurrenceRule | null {
  if (task.recurrenceRule) return task.recurrenceRule;
  return ruleFromLegacy(task.recurrence ?? 'none', task.dueDate ?? null);
}

/** توضیح فارسی قانون، مثلا «هر دوشنبه ساعت ۱۴:۰۰» */
export function describeFa(rule: RecurrenceRule): string {
  const parts: string[] = [];
  const n = toFaDigits(rule.interval);
  const timeFa = rule.time ? toFaDigits(rule.time) : null;

  if (rule.freq === 'daily') {
    parts.push(rule.interval === 1 ? 'هر روز' : `هر ${n} روز`);
  } else if (rule.freq === 'weekly') {
    const days = rule.byWeekday?.length
      ? [...new Set(rule.byWeekday)].sort((a, b) => a - b)
      : null;
    if (rule.interval === 1 && days && days.length === 1) {
      parts.push(`هر ${FA_WEEKDAYS_SHORT[days[0] as number]}`);
    } else if (rule.interval === 1 && days && days.length > 1) {
      parts.push(`هر هفته ${days.map((d) => FA_WEEKDAYS_SHORT[d as number]).join(' و ')}`);
    } else if (rule.interval === 1) {
      parts.push('هر هفته');
    } else {
      const ds = days && days.length ? ` (${days.map((d) => FA_WEEKDAYS_SHORT[d as number]).join(' و ')})` : '';
      parts.push(`هر ${n} هفته${ds}`);
    }
  } else if (rule.freq === 'monthly') {
    if (rule.monthlyMode === 'nthWeekday') {
      parts.push(rule.interval === 1 ? 'ماهانه (روز هفته‌ای)' : `هر ${n} ماه (روز هفته‌ای)`);
    } else {
      parts.push(rule.interval === 1 ? 'هر ماه' : `هر ${n} ماه`);
    }
  } else {
    parts.push(rule.interval === 1 ? 'هر سال' : `هر ${n} سال`);
  }

  if (timeFa) parts.push(`ساعت ${timeFa}`);
  if (rule.end?.type === 'onDate') parts.push(`تا ${formatJalali(rule.end.date)}`);
  else if (rule.end?.type === 'after') parts.push(`${toFaDigits(rule.end.count)} بار`);
  if (rule.missed === 'keep') parts.push('معوق می‌ماند');
  return parts.join('، ');
}
